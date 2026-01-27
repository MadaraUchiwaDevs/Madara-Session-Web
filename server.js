import express from "express";
import makeWASocket, {
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import pino from "pino";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.json({ error: "Numéro requis" });

  const { state, saveCreds } = await useMultiFileAuthState(
    "./sessions/" + number
  );

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  try {
    const code = await sock.requestPairingCode(number);
    res.json({ code });
  } catch (e) {
    res.json({ error: "Impossible de générer le code" });
  }
});

app.listen(3000, () => {
  console.log("🔥 Madara Session Server lancé sur le port 3000");
});
