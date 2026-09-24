const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "oscar123";

// YOUR MENU - New Price
const MENU = [
  { id: 1, name: "Chicken Shawarma + 1 Hotdog", price: 3500 },
  { id: 2, name: "Beef Shawarma + 1 Hotdog", price: 3500 },
  { id: 3, name: "Special Shawarma + 2 Hotdog", price: 4500 },
  { id: 4, name: "Jumbo Shawarma + 2 Hotdog", price: 5000 }
];

let carts = {};
let userState = {};

// 1. Verification for Meta
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

// 2. Receive Messages
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;
    const text = message.text?.body?.trim().toLowerCase() || "";

    if (!carts[from]) carts[from] = [];

    // MENU
    if (text === "hi" || text === "hello" || text === "menu" || text === "list") {
      let reply = "Welcome to *ALAOMA OSCAR SHAWARMA* 🌯🔥\n\n";
      reply += "*OUR MENU*\n";
      reply += "────────────\n";
      for (let i = 0; i < MENU.length; i++) {
        reply += (i + 1) + ". " + MENU[i].name + " - ₦" + MENU[i].price.toLocaleString() + "\n";
      }
      reply += "────────────\n\n";
      reply += "Type number to add to cart. E.g: *1* for Chicken Shawarma\n";
      reply += "Type *cart* to view your cart\n";
      reply += "Type *checkout* to order\n\n";
      reply += "📍 *Delivery:* Enugu Town (Fee depends on your location)\n";
      reply += "📞 07025635078";

      await sendMessage(from, reply);
      return res.sendStatus(200);
    }

    // ADD TO CART
    if (["1", "2", "3", "4"].includes(text)) {
      const item = MENU[parseInt(text) - 1];
      carts[from].push(item);

      let msg = "✅ Added: " + item.name + "\n";
      msg += "Price: ₦" + item.price.toLocaleString() + "\n\n";
      msg += "Add more? Type *menu*\n";
      msg += "View cart? Type *cart*";

      await sendMessage(from, msg);
      return res.sendStatus(200);
    }

    // VIEW CART
    if (text === "cart") {
      if (carts[from].length === 0) {
        await sendMessage(from, "Your cart empty o 😅\nType *menu* to see shawarma list");
        return res.sendStatus(200);
      }

      let total = 0;
      let message = "🛒 *YOUR CART*\n";
      message += "────────────\n";
      for (let i = 0; i < carts[from].length; i++) {
        const item = carts[from][i];
        total += item.price;
        message += (i + 1) + ". " + item.name + "\n";
        message += " ₦" + item.price.toLocaleString() + "\n";
      }
      message += "────────────\n";
      message += "TOTAL: ₦" + total.toLocaleString() + "\n\n";
      message += "Delivery fee go add based on your area for Enugu.\n\n";
      message += "Type *checkout* to place order";

      await sendMessage(from, message);
      return res.sendStatus(200);
    }

    // CHECKOUT START
    if (text === "checkout") {
      if (carts[from].length === 0) {
        await sendMessage(from, "Cart empty. Type *menu* first.");
        return res.sendStatus(200);
      }
      userState[from] = "awaiting_name";
      await sendMessage(from, "Great! Let's place your order 🥳\n\nWhat is your full name?");
      return res.sendStatus(200);
    }

    // COLLECT DETAILS FLOW
    if (userState[from] === "awaiting_name") {
      userState[from + "_name"] = message.text.body;
      userState[from] = "awaiting_address";
      await sendMessage(from, "Thanks " + message.text.body + "!\n\nWetin be your delivery address for Enugu? (e.g: Emene, Abakpa, New Haven)");
      return res.sendStatus(200);
    }

    if (userState[from] === "awaiting_address") {
      userState[from + "_address"] = message.text.body;
      userState[from] = "awaiting_phone";
      await sendMessage(from, "Noted! Your area: " + message.text.body + "\n\nAbeg drop your active phone number:");
      return res.sendStatus(200);
    }

    if (userState[from] === "awaiting_phone") {
      userState[from + "_phone"] = message.text.body;
      userState[from] = "awaiting_email";
      await sendMessage(from, "Last one! Drop your email to get receipt:\n\nExample: alaomaoscar@gmail.com");
      return res.sendStatus(200);
    }

    if (userState[from] === "awaiting_email") {
      const email = message.text.body.trim();
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!emailValid) {
        await sendMessage(from, "Hmm, that email no correct o 😅\n\nAbeg type am again like this:\nalaomaoscar@gmail.com");
        return res.sendStatus(200);
      }

      // ORDER COMPLETE
      let total = 0;
      for (let i = 0; i < carts[from].length; i++) total += carts[from][i].price;

      let orderSummary = "✅ *ORDER RECEIVED!* ✅\n";
      orderSummary += "────────────\n";
      orderSummary += "Name: " + userState[from + "_name"] + "\n";
      orderSummary += "Address: " + userState[from + "_address"] + "\n";
      orderSummary += "Phone: " + userState[from + "_phone"] + "\n";
      orderSummary += "Email: " + email + "\n";
      orderSummary += "────────────\n";
      orderSummary += "Items: " + carts[from].length + " | Total: ₦" + total.toLocaleString() + "\n";
      orderSummary += "Delivery: Enugu (Fee based on location)\n";
      orderSummary += "────────────\n\n";
      orderSummary += "We go call you now for 07025635078 to confirm delivery fee & delivery!\n\n";
      orderSummary += "Thanks for patronizing Alaoma Oscar Shawarma 🌯🙏";

      await sendMessage(from, orderSummary);

      // Clear cart
      carts[from] = [];
      userState[from] = null;
      return res.sendStatus(200);
    }

    // DEFAULT
    await sendMessage(from, "Type *menu* to see our shawarma list 🌯");
    res.sendStatus(200);

  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);
    res.sendStatus(200);
  }
});

async function sendMessage(to, text) {
  await axios.post("https://graph.facebook.com/v19.0/" + PHONE_NUMBER_ID + "/messages", {
    messaging_product: "whatsapp",
    to: to,
    text: { body: text }
  }, {
    headers: {
      Authorization: "Bearer " + WHATSAPP_TOKEN,
      "Content-Type": "application/json"
    }
  });
  console.log("Sent OK to " + to);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot running on " + PORT));
