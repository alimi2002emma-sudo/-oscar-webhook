app.post('/webhook', async (req, res) => {
  try {
    let msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg) {
      let from = msg.from;
      let text = msg.text?.body || '';
      console.log('Incoming:', from, text);
      let resp = await axios.post(
        `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
        { messaging_product: "whatsapp", to: from, text: { body: `Oscar Shawarma 🥙 You said: ${text}` } },
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
