const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'oscar123';
const PORT = process.env.PORT || 10000;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ALL GREETINGS IN THE WORLD
const GREETINGS = [
  'hi', 'hello', 'hey', 'hiya', 'howdy', 'yo', 'sup', 'whats up', "what's up",
  'good morning', 'good afternoon', 'good evening', 'greetings', 'how far', 'wey', 'how are you',
  'bawo', 'ekaro', 'ekasan', 'ekale', 'pele', // Yoruba
  'sannu', 'ina kwana', 'sannu da rana', // Hausa
  'kedu', 'ndewo', 'kedu ka', // Igbo
  'salam', 'salaam', 'assalam', 'assalamu alaikum', 'aslm', 'slm', // Arabic
  'bonjour', 'bonsoir', 'salut', // French
  'hola', 'buenos dias', 'buenas', // Spanish
  'ciao', 'buongiorno', // Italian
  'ola', 'oi', // Portuguese
  'hallo', 'guten morgen', // German
  'jambo', 'habari' // Swahili
];

function isGreeting(text) {
  const t = text.toLowerCase().trim();
  return GREETINGS.some(g => t.includes(g));
}

app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  return res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  try {
    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const from = msg.from;
    const text = msg.text?.body || "";
    const lower = text.toLowerCase();

    let reply = "";

    if (isGreeting(lower)) {
      reply = "Hi boss! 👋 Welcome to Oscar Shawarma! 🔥\n\nI sabi all greetings for this world o!\n\nYou fit type:\n1️⃣ Menu\n2️⃣ Order\n3️⃣ Location\n\nWetin you want?";
    } else if (lower.includes('menu')) {
      reply = "🍔 OSCAR MENU 🍕\n- Chicken Shawarma - 2500\n- Beef Shawarma - 3000\n- Pizza - 5000\n\nSend 'order' to order!";
    } else {
      reply = `You said: "${text}" 😊\n\nI be Oscar bot, I dey here to help! Type *hi* or *menu*`;
    }

    if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
      await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      }, { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } });
    }

    res.sendStatus(200);
  } catch(e){ console.log(e.message); res.sendStatus(200); }
});

app.get('/', (req,res)=> res.send('Oscar Ultimate Bot Running!'));
app.listen(PORT, ()=> console.log('Running on '+PORT));
