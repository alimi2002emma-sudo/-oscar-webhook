const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'oscar123';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.get('/webhook', (req, res) => {
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  try {
    let msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg) {
      let from = msg.from;
      let text = msg.text?.body || '';
      console.log('Incoming:', from, text);
      let resp = await axios.post(
        `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
        { messaging_product: "whatsapp", to: from, text: { body: `Oscar Shawarma 🥙\nYou said: ${text}\n\nType MENU` } },
        { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
      );
      console.log('Sent OK:', resp.data);
    }
    res.sendStatus(200);
  } catch (e) {
    console.log('SEND ERROR:', e.response?.data || e.message);
    res.sendStatus(200);
  }
});


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

      <p>Oscar Shawarma respects your privacy. This Privacy Policy explains how information is handled when you communicate with us through WhatsApp.</p>

      <h2>Information We Collect</h2>
      <p>When you contact Oscar Shawarma through WhatsApp, we may receive your WhatsApp phone number and the messages or order information you send to us.</p>

      <h2>How We Use Information</h2>
      <p>We use this information to respond to customers, process orders, provide customer support, and communicate about orders.</p>

      <h2>Information Sharing</h2>
      <p>We do not sell your personal information. Information may be processed by service providers used to operate our WhatsApp ordering system and process payments.</p>

      <h2>Data Retention</h2>
      <p>We retain information only for as long as reasonably necessary to provide our services, process orders, maintain records, and meet applicable legal obligations.</p>

      <h2>Your Privacy Choices</h2>
      <p>You may contact Oscar Shawarma to ask questions about your information or request deletion where applicable.</p>

      <h2>Contact</h2>
      <p>For privacy questions, please contact Oscar Shawarma through our official business contact channels.</p>

      <p><strong>Last updated: September 2026</strong></p>
    </body>
    </html>
  `);
});
app.get('/', (req, res) => res.send('Oscar bot live!'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
