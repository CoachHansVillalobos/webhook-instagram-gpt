import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = "gptbot123"; // Este token debe coincidir con el que pusiste en Meta
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

app.use(bodyParser.json());

// ✅ Ruta GET para verificación del webhook de Meta
app.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente");
    return res.status(200).send(challenge);
  } else {
    return res.status(403).send("Verificación fallida");
  }
});

// ✅ Ruta POST para recibir y responder mensajes
app.post("/", async (req, res) => {
  const message = req.body.entry?.[0]?.messaging?.[0]?.message?.text || "No se detectó mensaje";
  const senderId = req.body.entry?.[0]?.messaging?.[0]?.sender?.id;

  if (!senderId) return res.sendStatus(200);

  const reply = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
    }),
  }).then((r) => r.json());

  const text = reply.choices?.[0]?.message?.content || "No pude generar una respuesta 😢";

  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: senderId },
      message: { text },
      messaging_type: "RESPONSE",
    }),
  });

  res.sendStatus(200);
});

// 🔁 Arranca el servidor localmente (aunque Vercel lo maneja automáticamente)
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
