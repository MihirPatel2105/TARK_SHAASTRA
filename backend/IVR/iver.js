const express = require("express");
const twilio = require("twilio");

const router = express.Router();
const responses = [];
const sseClients = [];
const BASE_URL = (process.env.NGROK_URL || "").replace(/\/$/, "");

const AUDIO_1_URL = process.env.AUDIO_1_URL || "https://res.cloudinary.com/dje2kddqv/video/upload/v1776514463/%E0%AA%A8%E0%AA%AE%E0%AA%B8%E0%AB%8D%E0%AA%A4%E0%AB%87_%E0%AA%A4%E0%AA%AE%E0%AA%BE%E0%AA%B0%E0%AB%80_%E0%AA%AB%E0%AA%B0%E0%AA%BF%E0%AA%AF%E0%AA%BE%E0%AA%A6.mp3_csxpaj.mp3";
const AUDIO_2_URL = process.env.AUDIO_2_URL || "https://res.cloudinary.com/dje2kddqv/video/upload/v1776520210/_%E0%AA%A4%E0%AA%AE%E0%AA%BE%E0%AA%B0%E0%AB%80_%E0%AA%AB%E0%AA%B0%E0%AA%BF%E0%AA%AF%E0%AA%BE%E0%AA%A6_%E0%AA%AC%E0%AA%82%E0%AA%A7_%E0%AA%95%E0%AA%B0.mp3_xmqoix.mp3";
const AUDIO_3_URL = process.env.AUDIO_3_URL || "https://res.cloudinary.com/dje2kddqv/video/upload/v1776520247/_%E0%AA%A4%E0%AA%AE%E0%AA%BE%E0%AA%B0%E0%AB%80_%E0%AA%AB%E0%AA%B0%E0%AA%BF%E0%AA%AF%E0%AA%BE%E0%AA%A6_%E0%AA%AB%E0%AA%B0%E0%AB%80%E0%AA%A5%E0%AB%80.mp3_xzte1d.mp3";

function addResponseLog(entry) {
  const item = { timestamp: Date.now(), ...entry };
  responses.unshift(item);
  if (responses.length > 100) responses.pop();

  const payload = `data: ${JSON.stringify(item)}\n\n`;
  sseClients.forEach((clientRes) => clientRes.write(payload));
}

const hasTwilioCredentials = Boolean(
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
);

const client = hasTwilioCredentials
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

function formatPhone(phone) {
  const raw = (phone || "").toString().trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  return `+91${raw}`;
}

/* ===============================
   1. TRIGGER CALL
================================ */
async function triggerCall(phone) {
  try {
    if (!client) {
      throw new Error("Twilio credentials are missing in environment variables");
    }

    if (!BASE_URL) {
      throw new Error("NGROK_URL is missing in .env");
    }

    const to = formatPhone(phone);
    if (!to) {
      throw new Error("Phone number is missing");
    }

    const call = await client.calls.create({
      url: `${BASE_URL}/ivr?attempt=1`,
      to,
      from: process.env.TWILIO_PHONE,
    });

    console.log("📞 Call triggered:", call.sid);
  } catch (err) {
    console.error("❌ Call Error:", err.message);
  }
}

// test route
router.get("/call-me", async (req, res) => {
  const phone = req.query.phone || "9662876737";
  await triggerCall(phone);
  res.send("📞 Calling...");
});

/* ===============================
   1B. UI + Responses API
================================ */
router.get("/", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IVR Gujarati Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f6f8fb; color: #0f172a; }
    h1 { margin: 0 0 8px; }
    .muted { color: #475569; margin-bottom: 16px; }
    .card { background: #fff; border: 1px solid #dbe3ef; border-radius: 10px; padding: 16px; margin-bottom: 14px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    input { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; min-width: 220px; }
    button { padding: 8px 12px; border: none; border-radius: 8px; background: #2563eb; color: white; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    th { background: #f8fafc; }
    .ok { color: #15803d; font-weight: 700; }
    .bad { color: #b91c1c; font-weight: 700; }
    .warn { color: #a16207; font-weight: 700; }
  </style>
</head>
<body>
  <h1>IVR Gujarati Dashboard</h1>
  <div class="muted">Gujarati call flow + instant user key responses</div>

  <div class="card">
    <div class="row">
      <input id="phone" placeholder="9662876737" />
      <button onclick="callMe()">Trigger Call</button>
      <span id="msg"></span>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">User Responses</h3>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>From</th>
          <th>Digit</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </div>

  <script>
    async function callMe() {
      const phone = document.getElementById('phone').value.trim() || '9662876737';
      const res = await fetch('/call-me?phone=' + encodeURIComponent(phone));
      document.getElementById('msg').textContent = await res.text();
      setTimeout(loadResponses, 800);
    }

    async function loadResponses() {
      const res = await fetch('/api/responses');
      const data = await res.json();
      const rows = document.getElementById('rows');
      rows.innerHTML = data.map(r => {
        const cls = r.status.includes('RESOLVED') ? 'ok' : (r.status.includes('REOPEN') ? 'bad' : 'warn');
        return '<tr>' +
          '<td>' + new Date(r.timestamp).toLocaleString() + '</td>' +
          '<td>' + (r.from || '-') + '</td>' +
          '<td>' + (r.digit || '-') + '</td>' +
          '<td class="' + cls + '">' + r.status + '</td>' +
        '</tr>';
      }).join('');
    }

    const stream = new EventSource('/api/stream');
    stream.onmessage = function() {
      loadResponses();
    };

    loadResponses();
    setInterval(loadResponses, 2000);
  </script>
</body>
</html>`);
});

router.get("/api/responses", (req, res) => {
  res.json(responses);
});

router.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write("data: connected\\n\\n");
  sseClients.push(res);

  req.on("close", () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

/* ===============================
   2. IVR START (Gujarati Audio)
================================ */
router.post("/ivr", (req, res) => {
  const attempt = Number.parseInt(req.query.attempt || req.body.attempt || "1", 10);
  const safeAttempt = Number.isNaN(attempt) || attempt < 1 ? 1 : attempt;
  const responseUrl = BASE_URL ? `${BASE_URL}/response?attempt=${safeAttempt}` : `/response?attempt=${safeAttempt}`;
  const retryUrl = BASE_URL ? `${BASE_URL}/ivr?attempt=${safeAttempt + 1}` : `/ivr?attempt=${safeAttempt + 1}`;

  res.type("text/xml");

  if (safeAttempt <= 2) {
    res.send(`
<Response>
  <Gather input="dtmf" numDigits="1" action="${responseUrl}" method="POST" timeout="5">
    <Play>
      ${AUDIO_1_URL}
    </Play>
  </Gather>
  ${safeAttempt < 2 ? `<Redirect method="POST">${retryUrl}</Redirect>` : "<Pause length=\"5\"/><Hangup/>"}
</Response>
    `);
    return;
  }

  res.send(`
<Response>
  <Pause length="5"/>
  <Hangup/>
</Response>
  `);
});

/* ===============================
   3. HANDLE RESPONSE
================================ */
router.post("/response", (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const query = req.query && typeof req.query === "object" ? req.query : {};
  const digit = (body.Digits || body.digits || query.Digits || query.digits || "").toString().trim();
  const from = body.From || body.from || query.From || query.from || "Unknown";
  const attempt = Number.parseInt(req.query.attempt || "1", 10);
  const safeAttempt = Number.isNaN(attempt) || attempt < 1 ? 1 : attempt;
  const retryUrl = BASE_URL ? `${BASE_URL}/ivr?attempt=${safeAttempt + 1}` : `/ivr?attempt=${safeAttempt + 1}`;

  let status = "";
  let followUpAudio = "";

  if (digit === "1") {
    status = "RESOLVED ✅";
    followUpAudio = AUDIO_2_URL;
  } else if (digit === "2") {
    status = "REOPEN ❌";
    followUpAudio = AUDIO_3_URL;
  } else {
    status = "NO RESPONSE ⚠️";
  }

  addResponseLog({ from, digit: digit || "", status });

  console.log("📞 User pressed:", digit || "(none)");
  console.log("📊 Status:", status);

  res.type("text/xml");

  if (followUpAudio) {
    res.send(`
<Response>
  <Play>${followUpAudio}</Play>
  <Hangup/>
</Response>
    `);
    return;
  }

  if (safeAttempt < 2) {
    res.send(`
<Response>
  <Redirect method="POST">${retryUrl}</Redirect>
</Response>
    `);
    return;
  }

  res.send(`
<Response>
  <Pause length="5"/>
  <Hangup/>
</Response>
  `);
});

module.exports = {
  ivrRouter: router,
  triggerCall,
};