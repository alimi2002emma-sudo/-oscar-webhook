const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "oscar123";

// MENU
const MENU = [
  { id: 1, name: "Chicken Shawarma + 1 Hotdog", price: 3500 },
  { id: 2, name: "Beef Shawarma + 1 Hotdog", price: 3500 },
  { id: 3, name: "Special Shawarma + 2 Hotdog", price: 4500 },
  { id: 4, name: "Jumbo Shawarma + 2 Hotdog", price: 5000 }
];

let carts = {};
let userState = {};
let pendingItem = {};
let welcomed = {};

// 1. META WEBHOOK VERIFICATION
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

// 2. RECEIVE WHATSAPP MESSAGES
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;
    const text = message.text?.body?.trim().toLowerCase() || "";

    if (!carts[from]) carts[from] = [];

    // GREETINGS & MENU
const greetings = [
  "hi",
  "hello",
  "hey",
  "hii",
  "hiii",
  "heyy",
  "wassup",
  "what's up",
  "whats up",
  "yo",
  "good morning",
  "good afternoon",
  "good evening",
  "how are you",
  "how are you doing",
  "how far",
  "hi oscar"
];

let welcomed = {};

if (
 !welcomed[from] ||
  greetings.some(g => text.includes(g)) ||
  text === "menu" ||
  text === "list"
) {
  welcomed[from] = true;

  let reply = "Welcome to *ALAOMA OSCAR SHAWARMA* 🌯\n\n";
  reply += "We are delighted to serve you.\n\n";
  reply += "*OUR MENU*\n";
  reply += "────────────\n";
  for (let i = 0; i < MENU.length; i++) {
    reply += (i + 1) + ". " + MENU[i].name + " - ₦" + MENU[i].price.toLocaleString() + "\n";
  }
  reply += "────────────\n\n";
  reply += "Reply with a menu number to add an item to your cart.\n";
  reply += "Type *CART* to view your cart.\n";
  reply += "Type *ABOUT* for business information.\n";
  reply += "Type *CHECKOUT* to place your order.\n\n";
  reply += "📍 Delivery: Enugu Town - Fee depends on your location.\n";
  reply += "📞 07025635078";

  await sendMessage(from, reply);
  return res.sendStatus(200);
} {
      let reply = "Welcome to OSCAR SHAWARMA 🌯🔥\n\n";

      reply += "We are delighted to serve you.\n\n";

      reply += "OUR MENU\n";
      reply += "────────────\n";

      for (let i = 0; i < MENU.length; i++) {
        reply +=
          (i + 1) +
          ". " +
          MENU[i].name +
          " - ₦" +
          MENU[i].price.toLocaleString() +
          "\n";
      }

      reply += "────────────\n\n";

      reply += "Reply with a menu number to add an item to your cart.\n";
      reply += "For example, reply 1 for Chicken Shawarma.\n\n";

      reply += "Type CART to view your cart.\n";
      reply += "Type CHECKOUT to place your order.\n\n";

      reply += "📍 Delivery: Enugu Town\n";
      reply += "Delivery fee depends on your location.\n";
      reply += "📞 07025635078";

      await sendMessage(from, reply);
      return res.sendStatus(200);
    }

   // RECEIVE QUANTITY
if (userState[from] === "awaiting_quantity") {
  const quantity = parseInt(text);

  if (isNaN(quantity) || quantity < 1 || quantity > 50) {
    await sendMessage(
      from,
      "Please enter a valid quantity between 1 and 50."
    );
    return res.sendStatus(200);
  }

  const item = pendingItem[from];

  for (let i = 0; i < quantity; i++) {
    carts[from].push(item);
  }

  const subtotal = item.price * quantity;

  pendingItem[from] = null;
  userState[from] = null;

  let msg = "✅ ITEM ADDED TO CART\n\n";
  msg += quantity + " × " + item.name + "\n";
  msg += "Subtotal: ₦" + subtotal.toLocaleString() + "\n\n";
  msg += "Type MENU to add another item.\n";
  msg += "Type CART to review your order.";

  await sendMessage(from, msg);
  return res.sendStatus(200);
}

// ADD TO CART
if (["1", "2", "3", "4"].includes(text)) {
  const item = MENU[parseInt(text) - 1];

  pendingItem[from] = item;
  userState[from] = "awaiting_quantity";

  await sendMessage(
    from,
    "How many would you like?\n\n" +
    "Item: " + item.name + "\n" +
    "Price per item: ₦" + item.price.toLocaleString() + "\n\n" +
    "Please enter the quantity. Example: 3"
  );

  return res.sendStatus(200);
}

    // VIEW CART
    if (text === "cart") {
      if (carts[from].length === 0) {
        await sendMessage(
          from,
          "Your cart is currently empty.\n\nType MENU to view our shawarma menu."
        );

        return res.sendStatus(200);
      }

      let total = 0;

      let messageText = "🛒 YOUR CART\n";
      messageText += "────────────\n";

      for (let i = 0; i < carts[from].length; i++) {
        const item = carts[from][i];

        total += item.price;

        messageText +=
          i + 1 + ". " + item.name + "\n";

        messageText +=
          "₦" + item.price.toLocaleString() + "\n\n";
      }

      messageText += "────────────\n";
      messageText +=
        "TOTAL: ₦" + total.toLocaleString() + "\n\n";

      messageText +=
        "Delivery fee will be confirmed based on your location.\n\n";

      messageText += "Type CHECKOUT to place your order.";

      await sendMessage(from, messageText);
      return res.sendStatus(200);
    }

    // CHECKOUT START
    if (text === "checkout") {
      if (carts[from].length === 0) {
        await sendMessage(
          from,
          "Your cart is currently empty.\n\nType MENU to view our menu and select an item."
        );

        return res.sendStatus(200);
      }

      userState[from] = "awaiting_name";

      await sendMessage(
        from,
        "Great! Let's place your order. 🎉\n\nPlease enter your full name."
      );

      return res.sendStatus(200);
    }

    // COLLECT CUSTOMER NAME
    if (userState[from] === "awaiting_name") {
      userState[from + "_name"] = message.text.body;

      userState[from] = "awaiting_address";

      await sendMessage(
        from,
        "Thank you, " +
          message.text.body +
          ".\n\nPlease enter your full delivery address in Enugu.\n\nExample: Emene, Abakpa or New Haven."
      );

      return res.sendStatus(200);
    }

    // COLLECT DELIVERY ADDRESS
    if (userState[from] === "awaiting_address") {
      userState[from + "_address"] = message.text.body;

      userState[from] = "awaiting_phone";

      await sendMessage(
        from,
        "Thank you. Your delivery location has been noted.\n\nPlease provide your active phone number."
      );

      return res.sendStatus(200);
    }

    // COLLECT PHONE NUMBER
    if (userState[from] === "awaiting_phone") {
      userState[from + "_phone"] = message.text.body;

      userState[from] = "awaiting_email";

      await sendMessage(
        from,
        "Thank you.\n\nPlease provide your email address to receive your order receipt.\n\nExample: alaomaoscar@gmail.com"
      );

      return res.sendStatus(200);
    }

    // COLLECT EMAIL
    if (userState[from] === "awaiting_email") {
      const email = message.text.body.trim();

      const emailValid =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!emailValid) {
        await sendMessage(
          from,
          "The email address entered appears to be invalid.\n\nPlease enter a valid email address.\n\nExample: alaomaoscar@gmail.com"
        );

        return res.sendStatus(200);
      }

      // CALCULATE TOTAL
      let total = 0;

      for (let i = 0; i < carts[from].length; i++) {
        total += carts[from][i].price;
      }

      // ORDER SUMMARY
      let orderSummary = "✅ ORDER RECEIVED\n";
      orderSummary += "────────────\n";

      orderSummary +=
        "Name: " +
        userState[from + "_name"] +
        "\n";

      orderSummary +=
        "Address: " +
        userState[from + "_address"] +
        "\n";

      orderSummary +=
        "Phone: " +
        userState[from + "_phone"] +
        "\n";

      orderSummary +=
        "Email: " +
        email +
        "\n";

      orderSummary += "────────────\n";

      orderSummary +=
        "Items: " +
        carts[from].length +
        "\n";

      orderSummary +=
        "Total: ₦" +
        total.toLocaleString() +
        "\n";

      orderSummary +=
        "Delivery: Enugu\n";

      orderSummary +=
        "Delivery fee will be confirmed based on your location.\n";

      orderSummary += "────────────\n\n";

      orderSummary +=
        "Our team will contact you on 07025635078 to confirm your delivery fee and delivery details.\n\n";

      orderSummary +=
        "Thank you for choosing Oscar Shawarma. 🌯❤️";

      await sendMessage(from, orderSummary);

      // CLEAR CART AND USER STATE
      carts[from] = [];
      userState[from] = null;

      return res.sendStatus(200);
    }

    // DEFAULT RESPONSE
    await sendMessage(
      from,
      "I did not understand that request.\n\nType MENU to view our shawarma menu."
    );

    res.sendStatus(200);

  } catch (err) {
    console.log(
      "ERROR:",
      err.response?.data || err.message
    );

    res.sendStatus(200);
  }
});

// SEND WHATSAPP MESSAGE
async function sendMessage(to, text) {
  await axios.post(
    "https://graph.facebook.com/v19.0/" +
      PHONE_NUMBER_ID +
      "/messages",
    {
      messaging_product: "whatsapp",
      to: to,
      text: {
        body: text
      }
    },
    {
      headers: {
        Authorization: "Bearer " + WHATSAPP_TOKEN,
        "Content-Type": "application/json"
      }
    }
  );

  console.log("Sent OK to " + to);
}

// START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Bot running on " + PORT);
});
