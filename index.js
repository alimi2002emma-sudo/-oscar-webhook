const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'oscar123';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Temporary in-memory carts.
// Later we can move this to a proper database.
const users = {};

const MENU = {
  "1": {
    name: "Chicken Shawarma + 1 Hotdog",
    price: 3500
  },
  "2": {
    name: "Beef Shawarma + 1 Hotdog",
    price: 3500
  },
  "3": {
    name: "Special Shawarma + 2 Hotdogs",
    price: 4500
  },
  "4": {
    name: "Jumbo Shawarma + 2 Hotdogs",
    price: 5000
  }
};

// ===============================
// WHATSAPP WEBHOOK VERIFICATION
// ===============================

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// ===============================
// SEND WHATSAPP MESSAGE
// ===============================

async function sendMessage(to, body) {
  try {
    const response = await axios.post(
  `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: {
          body: body
        }
      },
      {
        headers: {
          Authorization: 'Bearer ${WHATSAPP_TOKEN},
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Sent OK:", response.data);
  } catch (error) {
    console.log(
      "SEND ERROR:",
      error.response?.data || error.message
    );
  }
}

// ===============================
// FORMAT CART
// ===============================

function getCartTotal(cart) {
  return cart.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
}

function formatCart(cart) {
  if (!cart || cart.length === 0) {
    return "Your cart is currently empty.";
  }

  let message = "🛒 YOUR CART\n\n";

  cart.forEach((item, index) => {
    const subtotal = item.price * item.quantity;

    message += ${index + 1}. ${item.name}\n;
    message += Quantity: ${item.quantity}\n;
    message += Subtotal: ₦${subtotal.toLocaleString()}\n\n;
  });

  const total = getCartTotal(cart);

  message += ━━━━━━━━━━━━━━\n;
  message += TOTAL: ₦${total.toLocaleString()};

  return message;
}

// ===============================
// WELCOME MESSAGE
// ===============================

function welcomeMessage() {
  return `🌯 WELCOME TO OSCAR SHAWARMA!

Fresh, tasty and loaded just the way you like it 😋

What would you like to do?

1️⃣ View Menu
2️⃣ Place an Order
3️⃣ View Cart
4️⃣ Contact Us

Reply with the number of your choice.`;
}

// ===============================
// MENU
// ===============================

function menuMessage() {
  return `🌯 OSCAR SHAWARMA MENU

1️⃣ Chicken Shawarma + 1 Hotdog
₦3,500

2️⃣ Beef Shawarma + 1 Hotdog
₦3,500

3️⃣ Special Shawarma + 2 Hotdogs
₦4,500

4️⃣ Jumbo Shawarma + 2 Hotdogs
₦5,000

━━━━━━━━━━━━━━

Reply with the number of the item you'd like to order.

Example: 1`;
}

// ===============================
// CONTACT
// ===============================

function contactMessage() {
  return `📞 OSCAR SHAWARMA

Phone: 07025635078
WhatsApp: +2347025635078
Email: alaomaoscar@gmail.com

📍 Delivery is available mainly around Enugu, especially Enugu town.

🚚 Delivery fee depends on your location.`;
}

// ===============================
// HANDLE CUSTOMER MESSAGE
// ===============================

app.post('/webhook', async (req, res) => {
  try {
    const msg =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!msg) {
      return res.sendStatus(200);
    }

    const from = msg.from;
    const text = (msg.text?.body || '').trim();
    const input = text.toLowerCase();

    console.log("Incoming:", from, text);

    // Create user session
    if (!users[from]) {
      users[from] = {
        cart: [],
        state: "MAIN_MENU"
      };
    }

    const user = users[from];

    // ===============================
    // GREETINGS
    // ===============================

    if (
      input === "hi" ||
      input === "hello" ||
      input === "hey" ||
      input === "start" ||
      input === "menu"
    ) {
      user.state = "MAIN_MENU";

      await sendMessage(from, welcomeMessage());

      return res.sendStatus(200);
    }

    // ===============================
    // MAIN MENU
    // ===============================

    if (user.state === "MAIN_MENU") {

      if (input === "1") {
        await sendMessage(from, menuMessage());
        user.state = "SELECTING_ITEM";
        return res.sendStatus(200);
      }

      if (input === "2") {
        await sendMessage(
          from,
          ${menuMessage()}\n\nSelect an item to begin your order.
        );

        user.state = "SELECTING_ITEM";
        return res.sendStatus(200);
      }

      if (input === "3") {
        await sendMessage(from, formatCart(user.cart));

        await sendMessage(
          from,
          `\n\nReply:

1️⃣ Add another item
2️⃣ Checkout
3️⃣ Main Menu`
        );

        user.state = "CART_MENU";
        return res.sendStatus(200);
      }

      if (input === "4") {
        await sendMessage(from, contactMessage());
        return res.sendStatus(200);
      }

      await sendMessage(
        from,
        "Please choose an option from the menu.\n\n" +
        "1️⃣ View Menu\n" +
        "2️⃣ Place an Order\n" +
        "3️⃣ View Cart\n" +
        "4️⃣ Contact Us"
      );

      return res.sendStatus(200);
    }

    // ===============================
    // SELECT ITEM
    // ===============================

    if (user.state === "SELECTING_ITEM") {

      if (!MENU[input]) {
        await sendMessage(
          from,
          "Please select a valid item:\n\n" +
          "1️⃣ Chicken Shawarma + 1 Hotdog — ₦3,500\n" +
          "2️⃣ Beef Shawarma + 1 Hotdog — ₦3,500\n" +
          "3️⃣ Special Shawarma + 2 Hotdogs — ₦4,500\n" +
          "4️⃣ Jumbo Shawarma + 2 Hotdogs — ₦5,000"
        );

        return res.sendStatus(200);
      }

      user.selectedItem = MENU[input];
      user.state = "SELECTING_QUANTITY";

      await sendMessage(
        from,
        `🌯 ${MENU[input].name}

Price: ₦${MENU[input].price.toLocaleString()}

How many would you like?

Reply with a number.
Example: 2`
      );

      return res.sendStatus(200);
    }

    // ===============================
    // SELECT QUANTITY
    // ===============================

    if (user.state === "SELECTING_QUANTITY") {

      const quantity = parseInt(input);

      if (isNaN(quantity) || quantity < 1 || quantity > 20) {
        await sendMessage(
          from,
          "Please enter a valid quantity between 1 and 20."
        );

        return res.sendStatus(200);
      }

      const existingItem = user.cart.find(
        item => item.name === user.selectedItem.name
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        user.cart.push({
          name: user.selectedItem.name,
          price: user.selectedItem.price,
          quantity: quantity
        });
      }

      user.selectedItem = null;

      await sendMessage(
        from,
        `✅ Added to your cart!

${formatCart(user.cart)}

What would you like to do?

1️⃣ Add another item
2️⃣ Checkout
3️⃣ View Cart`
      );

      user.state = "CART_MENU";

      return res.sendStatus(200);
    }

    // ===============================
    // CART MENU
    // ===============================

    if (user.state === "CART_MENU") {

      if (input === "1") {
        await sendMessage(from, menuMessage());
        user.state = "SELECTING_ITEM";
        return res.sendStatus(200);
      }

      if (input === "2") {

        if (user.cart.length === 0) {
          await sendMessage(
            from,
            "Your cart is empty. Please add an item first."
          );

          user.state = "MAIN_MENU";
          return res.sendStatus(200);
        }

        await sendMessage(
          from,
          `${formatCart(user.cart)}

━━━━━━━━━━━━━━

Let's complete your order.

Please enter your name.`
        );

        user.state = "GETTING_NAME";

        return res.sendStatus(200);
      }

      if (input === "3") {
        await sendMessage(
          from,
          formatCart(user.cart)
        );

        return res.sendStatus(200);
      }

      await sendMessage(
        from,
        "Please choose:\n\n" +
        "1️⃣ Add another item\n" +
        "2️⃣ Checkout\n" +
        "3️⃣ View Cart"
      );

      return res.sendStatus(200);
    }

    // ===============================
    // CUSTOMER NAME
    // ===============================

    if (user.state === "GETTING_NAME") {

      if (text.length < 2) {
        await sendMessage(
          from,
          "Please enter your full name."
        );

        return res.sendStatus(200);
      }

      user.name = text;
      user.state = "GETTING_EMAIL";

      await sendMessage(
        from,
        `Thanks, ${user.name}! 🙌

Please enter your email address.

We'll use it for your payment receipt.`
      );

      return res.sendStatus(200);
    }

    // ===============================
    // CUSTOMER EMAIL
    // ===============================

    if (user.state === "GETTING_EMAIL") {

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(text)) {
        await sendMessage(
          from,
"That doesn't look like a valid email address" 
        );

        return res.sendStatus(200);
      }

      user.email = text;
      user.state = "GETTING_ADDRESS";

      await sendMessage(
        from,
        `📍 DELIVERY LOCATION

Please send your full delivery address in Enugu.

Example:

No. 10 Example Street,
Independence Layout,
Enugu.`
      );

      return res.sendStatus(200);
    }

    // ===============================
    // DELIVERY ADDRESS
    // ===============================

    if (user.state === "GETTING_ADDRESS") {

      user.address = text;

      const subtotal = getCartTotal(user.cart);

      await sendMessage(
        from,
        `📦 ORDER SUMMARY

${formatCart(user.cart)}

📍 Delivery Address:
${user.address}

🚚 Delivery fee:
To be confirmed based on your location.

Your current food total is:

₦${subtotal.toLocaleString()}

Oscar Shawarma will confirm the delivery fee before payment.

Please reply:

1️⃣ Confirm Order
2️⃣ Change Address
3️⃣ Cancel Order`
      );

      user.state = "CONFIRMING_ORDER";

      return res.sendStatus(200);
    }

    // ===============================
    // CONFIRM ORDER
    // ===============================

    if (user.state === "CONFIRMING_ORDER") {

      if (input === "1") {

        await sendMessage(
          from,
          `✅ ORDER DETAILS RECEIVED!

Thank you, ${user.name}.

Your order has been sent for delivery fee confirmation.

📍 ${user.address}

Food total: ₦${getCartTotal(user.cart).toLocaleString()}

Once the delivery fee is confirmed, we'll proceed to payment.

🌯 Oscar Shawarma`
        );

        console.log("NEW ORDER:", {
          customer: user.name,
          email: user.email,
          phone: from,
          address: user.address,
          cart: user.cart,
          foodTotal: getCartTotal(user.cart)
        });

        user.state = "ORDER_PENDING";

        return res.sendStatus(200);
      }

      if (input === "2") {
        user.state = "GETTING_ADDRESS";

        await sendMessage(
          from,
          "📍 No problem.

Please enter your correct delivery address."
        );

        return res.sendStatus(200);
      }

      if (input === "3") {
        user.cart = [];
        user.state = "MAIN_MENU";

        await sendMessage(
          from,
          "❌ Your order has been cancelled.

Type HI anytime to start again."
        );

        return res.sendStatus(200);
      }

      await sendMessage(
        from,
        "Please reply:\n\n" +
        "1️⃣ Confirm Order\n" +
        "2️⃣ Change Address\n" +
        "3️⃣ Cancel Order"
      );

      return res.sendStatus(200);
    }

    // ===============================
    // ORDER PENDING
    // ===============================

    if (user.state === "ORDER_PENDING") {

      await sendMessage(
        from,
        `Your order is currently being processed.

🌯 Oscar Shawarma

Type MENU to start a new order.`
      );

      return res.sendStatus(200);
    }

    // ===============================
    // DEFAULT
    // ===============================

    await sendMessage(
      from,
      welcomeMessage()
    );

    user.state = "MAIN_MENU";

    res.sendStatus(200);

  } catch (error) {

    console.log(
      "WEBHOOK ERROR:",
      error.response?.data || error.message
    );

    res.sendStatus(200);
  }
});

// ===============================
// PRIVACY POLICY
// ===============================

app.get('/privacy-policy', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Oscar Shawarma Privacy Policy</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>

    <body style="font-family: Arial; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6;">

      <h1>Oscar Shawarma Privacy Policy</h1>

      <p>
        Oscar Shawarma respects your privacy. This Privacy Policy explains how information is handled when you communicate with us through WhatsApp.
      </p>

      <h2>Information We Collect</h2>

      <p>
        When you contact Oscar Shawarma through WhatsApp, we may receive your WhatsApp phone number and the messages or order information you send to us.
      </p>

      <h2>How We Use Information</h2>

      <p>
        We use this information to respond to customers, process orders, provide customer support, and communicate about orders.
      </p>

      <h2>Information Sharing</h2>

      <p>
        We do not sell your personal information.
      </p>

      <h2>Data Retention</h2>

      <p>
        We retain information only for as long as reasonably necessary to provide our services and process orders.
      </p>

      <h2>Contact</h2>

      <p>
        For privacy questions, please contact Oscar Shawarma through our official business contact channels.
      </p>

      <p>
        <strong>Last updated: September 2026</strong>
      </p>

    </body>
    </html>
  `);
});

// ===============================
// HOME
// ===============================

app.get('/', (req, res) => {
  res.send('Oscar bot live!');
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(Server running on port ${PORT});
});
