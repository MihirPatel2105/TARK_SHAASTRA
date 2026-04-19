require("dotenv").config();

const express = require("express");
const path = require("path");
const axios = require("axios");
const twilio = require("twilio");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

const app = express();
const VoiceResponse = twilio.twiml.VoiceResponse;

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// Initialize MongoDB connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("[INFO] MongoDB connected for IVR persistence"))
  .catch((err) => console.warn("[WARN] MongoDB connection failed:", err.message));
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MAX_VERIFICATION_ATTEMPTS = Number.parseInt(process.env.IVR_MAX_ATTEMPTS || "2", 10) || 2;
const MAX_RECORDING_ATTEMPTS = Number.parseInt(process.env.IVR_MAX_RECORDING_ATTEMPTS || "3", 10) || 3;

const verificationResponses = [];
const verificationSseClients = new Set();

const AUDIO_1_URL =
  process.env.IVR_MENU_AUDIO_URL ||
  "https://res.cloudinary.com/dje2kddqv/video/upload/v1776514463/%E0%AA%A8%E0%AA%AE%E0%AA%B8%E0%AB%8D%E0%AA%A4%E0%AB%87_%E0%AA%A4%E0%AA%AE%E0%AA%BE%E0%AA%B0%E0%AB%80_%E0%AA%AB%E0%AA%B0%E0%AA%BF%E0%AA%AF%E0%AA%BE%E0%AA%A6.mp3_csxpaj.mp3";
const AUDIO_2_URL =
  process.env.IVR_OPTION_1_AUDIO_URL ||
  "https://res.cloudinary.com/dje2kddqv/video/upload/v1776520210/_%E0%AA%A4%E0%AA%AE%E0%AA%BE%E0%AA%B0%E0%AB%80_%E0%AA%AB%E0%AA%B0%E0%AA%BF%E0%AA%AF%E0%AA%BE%E0%AA%A6_%E0%AA%AC%E0%AA%82%E0%AA%A7_%E0%AA%95%E0%AA%B0.mp3_xmqoix.mp3";
const AUDIO_3_URL =
  process.env.IVR_OPTION_2_AUDIO_URL ||
  "https://res.cloudinary.com/dje2kddqv/video/upload/v1776520247/_%E0%AA%A4%E0%AA%AE%E0%AA%BE%E0%AA%B0%E0%AB%80_%E0%AA%AB%E0%AA%B0%E0%AA%BF%E0%AA%AF%E0%AA%BE%E0%AA%A6_%E0%AA%AB%E0%AA%B0%E0%AB%80%E0%AA%A5%E0%AB%80.mp3_xzte1d.mp3";

const requiredEnvVars = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`[WARN] Missing environment variable: ${envVar}`);
  }
}

const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const geminiEnabled = process.env.ENABLE_GEMINI_TRANSCRIPT === "true";
const geminiModelCandidates = (process.env.GEMINI_MODEL_CANDIDATES || "gemini-2.5-flash,gemini-2.0-flash")
  .split(",")
  .map((modelName) => modelName.trim().replace(/^models\//, ""))
  .filter(Boolean);

if (geminiEnabled && !geminiClient) {
  console.warn("[WARN] ENABLE_GEMINI_TRANSCRIPT is true but GEMINI_API_KEY is missing.");
}

// In-memory complaint store for live dashboard.
const complaints = [];
const sseClients = new Set();
const callLanguageBySid = new Map();
const promptAudioCache = new Map();
const languageConfig = {
  en: {
    name: "English",
    sayLanguage: "en-US",
    ttsLang: "en",
    prompts: {
      menu_option: "Press 1 for English.",
      invalid_language: "Invalid input. Please press 1 for English, 2 for Gujarati, or 3 for Hindi.",
      start_recording: "Please record your complaint after the beep.",
      no_recording: "We did not receive your recording. Please try again.",
      confirmation: "Your complaint has been registered. Thank you for calling.",
      generic_error: "We are sorry. An application error has occurred. Please try again.",
      ai_disabled_transcription: "Audio recording captured.",
      ai_disabled_summary: "AI summary is disabled.",
      processing_transcription: "Transcription is in progress...",
      processing_summary: "AI summary is in progress...",
      ai_unavailable_summary: "AI summary is unavailable.",
      queued: "Queued for AI processing",
      completed: "Completed",
      failedPrefix: "Failed",
      label_issue_type: "Issue Type",
      label_priority: "Priority",
      label_summary: "Summary"
    }
  },
  gu: {
    name: "Gujarati",
    sayLanguage: "gu-IN",
    ttsLang: "gu",
    prompts: {
      menu_option: "ગુજરાતી માટે 2 દબાવો.",
      invalid_language: "અમાન્ય પસંદગી. અંગ્રેજી માટે 1, ગુજરાતી માટે 2, અથવા હિન્દી માટે 3 દબાવો.",
      start_recording: "કૃપા કરીને તમારી ફરિયાદ રેકોર્ડ કરો.",
      no_recording: "અમને કોઈ રેકોર્ડિંગ મળ્યું નથી. કૃપા કરીને ફરી પ્રયાસ કરો.",
      confirmation: "તમારી ફરિયાદ નોંધાઈ ગઈ છે. કોલ કરવા બદલ આભાર.",
      generic_error: "માફ કરશો, તમારી ફરિયાદ નોંધવામાં સમસ્યા આવી. કૃપા કરીને ફરી પ્રયાસ કરો.",
      ai_disabled_transcription: "ઓડિયો રેકોર્ડિંગ મળી ગયું છે.",
      ai_disabled_summary: "AI સારાંશ બંધ છે.",
      processing_transcription: "ટ્રાન્સક્રિપ્શન પ્રક્રિયામાં છે...",
      processing_summary: "AI સારાંશ પ્રક્રિયામાં છે...",
      ai_unavailable_summary: "AI સારાંશ ઉપલબ્ધ નથી.",
      queued: "AI પ્રક્રિયા માટે કતારમાં",
      completed: "પૂર્ણ થયું",
      failedPrefix: "નિષ્ફળ",
      label_issue_type: "સમસ્યાનો પ્રકાર",
      label_priority: "પ્રાથમિકતા",
      label_summary: "સારાંશ"
    }
  },
  hi: {
    name: "Hindi",
    sayLanguage: "hi-IN",
    ttsLang: "hi",
    prompts: {
      menu_option: "हिंदी के लिए 3 दबाएं.",
      invalid_language: "अमान्य विकल्प। अंग्रेज़ी के लिए 1, गुजराती के लिए 2, या हिंदी के लिए 3 दबाएं।",
      start_recording: "कृपया बीप के बाद अपनी शिकायत रिकॉर्ड करें।",
      no_recording: "हमें आपकी रिकॉर्डिंग नहीं मिली। कृपया फिर से प्रयास करें।",
      confirmation: "आपकी शिकायत दर्ज हो गई है। कॉल करने के लिए धन्यवाद।",
      generic_error: "क्षमा करें, आपकी शिकायत दर्ज करने में समस्या आई। कृपया फिर से प्रयास करें।",
      ai_disabled_transcription: "ऑडियो रिकॉर्डिंग प्राप्त हो गई है।",
      ai_disabled_summary: "AI सारांश बंद है।",
      processing_transcription: "ट्रांसक्रिप्शन प्रक्रिया में है...",
      processing_summary: "AI सारांश प्रक्रिया में है...",
      ai_unavailable_summary: "AI सारांश उपलब्ध नहीं है।",
      queued: "AI प्रोसेसिंग के लिए कतार में",
      completed: "पूर्ण",
      failedPrefix: "विफल",
      label_issue_type: "समस्या प्रकार",
      label_priority: "प्राथमिकता",
      label_summary: "सारांश"
    }
  }
};

function getLanguageByDigit(digit) {
  if (digit === "1") return "en";
  if (digit === "2") return "gu";
  if (digit === "3") return "hi";
  return null;
}

function getLanguageForRequest(req) {
  const callSid = req.body.CallSid || req.query.CallSid;
  if (callSid && callLanguageBySid.has(callSid)) {
    return callLanguageBySid.get(callSid);
  }
  return "gu";
}

function getPromptText(language, promptKey) {
  const selected = languageConfig[language] || languageConfig.gu;
  return selected.prompts[promptKey] || languageConfig.gu.prompts[promptKey] || "";
}

function playLanguageMenu(twimlNode) {
  sayPrompt(twimlNode, "en", "menu_option");
  sayPrompt(twimlNode, "gu", "menu_option");
  sayPrompt(twimlNode, "hi", "menu_option");
}

function webhookUrl(routePath) {
  const baseUrl = process.env.NGROK_BASE_URL || process.env.NGROK_URL;
  if (!baseUrl) {
    return routePath;
  }
  return `${baseUrl.replace(/\/$/, "")}${routePath}`;
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function decodeMaybeEncodedUri(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function normalizePhoneNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("+")) {
    return raw;
  }

  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return raw;
}

function addVerificationResponseLog(entry) {
  const item = {
    timestamp: Date.now(),
    ...entry
  };

  verificationResponses.unshift(item);
  if (verificationResponses.length > 100) {
    verificationResponses.pop();
  }

  const payload = `data: ${JSON.stringify(item)}\n\n`;
  for (const client of verificationSseClients) {
    client.write(payload);
  }
}

function buildVerificationUrl(pathname, complaintId, callbackUrl, attempt) {
  return webhookUrl(
    `${pathname}?complaintId=${encodeURIComponent(complaintId)}&callbackUrl=${encodeURIComponent(callbackUrl)}&attempt=${encodeURIComponent(
      String(attempt)
    )}`
  );
}

async function isPublicIvrWebhookReachable() {
  const baseUrl = trimTrailingSlash(process.env.NGROK_BASE_URL || process.env.NGROK_URL);
  if (!baseUrl) {
    return false;
  }

  try {
    await axios.get(`${baseUrl}/status`, { timeout: 4000 });
    return true;
  } catch (_error) {
    return false;
  }
}

function buildFallbackVerificationTwiml() {
  const twiml = new VoiceResponse();

  if (AUDIO_1_URL) {
    twiml.play(AUDIO_1_URL);
  } else {
    twiml.say(
      { language: "gu-IN", voice: "alice" },
      "નમસ્તે. તમારી ફરિયાદ માટે ચકાસણી કોલ છે. હાલ ટેકનિકલ કારણોસર કીપેડ ચકાસણી ઉપલબ્ધ નથી. અમારી ટીમ તમને ટૂંક સમયમાં સંપર્ક કરશે."
    );
  }

  twiml.hangup();
  return twiml.toString();
}

async function triggerVerificationCall({ complaintId, citizenPhone, callbackUrl }) {
  const disableOutboundCall = String(process.env.DISABLE_OUTBOUND_IVR_CALL || "false").toLowerCase() === "true";

  if (!twilioClient) {
    throw new Error("Twilio client is not configured");
  }

  if (disableOutboundCall) {
    return {
      skipped: true,
      callSid: null,
      complaintId,
      citizenPhone,
      message: "Outbound IVR call is disabled by DISABLE_OUTBOUND_IVR_CALL"
    };
  }

  const forcedDemoPhone = normalizePhoneNumber(process.env.IVR_DEMO_PHONE || process.env.DEMO_IVR_PHONE || "");
  const callTarget = forcedDemoPhone || citizenPhone;

  const webhookReachable = await isPublicIvrWebhookReachable();

  const call = webhookReachable
    ? await twilioClient.calls.create({
        to: callTarget,
        from: process.env.TWILIO_PHONE,
        url: buildVerificationUrl("/ivr/verify", complaintId, callbackUrl, 1),
        method: "POST"
      })
    : await twilioClient.calls.create({
        to: callTarget,
        from: process.env.TWILIO_PHONE,
        twiml: buildFallbackVerificationTwiml()
      });

  return {
    skipped: false,
    callSid: call.sid,
    complaintId,
    citizenPhone: callTarget,
    fallbackMode: !webhookReachable,
    message: webhookReachable
      ? "Verification IVR call queued"
      : "Fallback verification call queued (public IVR webhook unavailable)"
  };
}

function sayPrompt(twiml, language, promptKey) {
  const useAudioPrompts = process.env.TWILIO_USE_AUDIO_PROMPTS === "true";
  const selected = languageConfig[language] || languageConfig.gu;
  const text = getPromptText(language, promptKey);

  if (useAudioPrompts && promptKey) {
    twiml.play(webhookUrl(`/tts/prompt/${encodeURIComponent(language)}/${encodeURIComponent(promptKey)}`));
    return;
  }

  twiml.say(
    {
      language: selected.sayLanguage,
      voice: "alice"
    },
    text
  );
}

function broadcastComplaint(complaint) {
  const payload = `data: ${JSON.stringify({ type: "new-complaint", complaint })}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

function broadcastComplaintUpdate(complaint) {
  const payload = `data: ${JSON.stringify({ type: "complaint-updated", complaint })}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadRecordingAudioBuffer(recordingUrl, options = {}) {
  const retries = options.retries ?? 5;
  const retryDelayMs = options.retryDelayMs ?? 1200;
  const downloadUrl = `${recordingUrl}.mp3`;

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN
        }
      });

      return Buffer.from(response.data);
    } catch (error) {
      lastError = error;
      const statusCode = error.response?.status;
      const canRetry = statusCode === 404 || statusCode === 429 || (statusCode >= 500 && statusCode < 600);

      if (!canRetry || attempt === retries) {
        break;
      }

      await sleep(retryDelayMs);
    }
  }

  throw lastError;
}

function parseGeminiJson(text) {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    return {
      transcription_text: cleaned,
      summary_text: cleaned,
      issue_type: "General",
      priority: "Medium"
    };
  }
}

async function transcribeAndSummarizeWithGemini(audioBuffer, language) {
  const selected = languageConfig[language] || languageConfig.gu;
  if (!geminiClient || !geminiEnabled) {
    return {
      transcriptionText: selected.prompts.ai_disabled_transcription,
      geminiSummary: selected.prompts.ai_disabled_summary
    };
  }

  const languageName = selected.name;

  const prompt = [
    `Transcribe this complaint audio and reply ONLY in ${languageName}.`,
    "Return JSON only.",
    "Required JSON keys: transcription_text, summary_text, issue_type, priority.",
    `transcription_text and summary_text must be in ${languageName}.`,
    "કોઈ વધારાનો લખાણ, markdown અથવા code block ન આપો."
  ].join(" ");

  let lastError;

  for (const modelName of geminiModelCandidates) {
    try {
      const model = geminiClient.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: "audio/mpeg",
            data: audioBuffer.toString("base64")
          }
        }
      ]);

      const responseText = (await result.response).text().trim();
      const parsed = parseGeminiJson(responseText);

      return {
        transcriptionText: parsed.transcription_text || "ટ્રાન્સક્રિપ્શન મળ્યું નથી.",
        geminiSummary: [
          `${getPromptText(language, "label_issue_type")}: ${parsed.issue_type || "General"}`,
          `${getPromptText(language, "label_priority")}: ${parsed.priority || "Medium"}`,
          `${getPromptText(language, "label_summary")}: ${parsed.summary_text || "No summary generated."}`
        ].join("\n")
      };
    } catch (error) {
      lastError = error;
      console.warn(`[WARN] Gemini model failed (${modelName}): ${error.message}`);
    }
  }

  throw lastError || new Error("All Gemini model candidates failed.");
}

async function enrichComplaintWithAi(complaintId) {
  const complaint = complaints.find((item) => item.id === complaintId);
  if (!complaint) {
    return;
  }

  try {
    const audioBuffer = await downloadRecordingAudioBuffer(complaint.recordingUrl);
    const aiResult = await transcribeAndSummarizeWithGemini(audioBuffer, complaint.language);

    complaint.transcriptionText = aiResult.transcriptionText;
    complaint.geminiSummary = aiResult.geminiSummary;
    complaint.processingStatus = getPromptText(complaint.language, "completed");
    broadcastComplaintUpdate(complaint);
  } catch (error) {
    complaint.processingStatus = `${getPromptText(complaint.language, "failedPrefix")}: ${error.message}`;
    complaint.geminiSummary = getPromptText(complaint.language, "ai_unavailable_summary");
    broadcastComplaintUpdate(complaint);
    console.error("[ERROR] AI enrichment failed:", error.message);
  }
}

app.all("/ivr", (req, res) => {
  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    numDigits: 1,
    action: webhookUrl("/menu"),
    method: "POST",
    timeout: 7
  });

  playLanguageMenu(gather);

  twiml.redirect({ method: "POST" }, webhookUrl("/ivr"));

  res.type("text/xml");
  res.send(twiml.toString());
});

app.post("/api/verification/call", async (req, res) => {
  try {
    const complaintId = String(req.body.complaintId || "").trim();
    const citizenPhone = normalizePhoneNumber(req.body.citizenPhone || "");
    const callbackUrl = String(req.body.callbackUrl || "").trim();

    if (!complaintId || !citizenPhone || !callbackUrl) {
      res.status(400).json({ message: "complaintId, citizenPhone, and callbackUrl are required" });
      return;
    }

    const result = await triggerVerificationCall({
      complaintId,
      citizenPhone,
      callbackUrl
    });

    res.json(result);
  } catch (error) {
    console.error("[ERROR] Failed to trigger verification call:", error.message);
    res.status(500).json({ message: `Failed to trigger verification call: ${error.message}` });
  }
});

app.get("/call-me", async (req, res) => {
  try {
    const phone = normalizePhoneNumber(req.query.phone || process.env.IVR_DEMO_PHONE || process.env.DEMO_IVR_PHONE || "");
    const callbackUrl = String(req.query.callbackUrl || process.env.IVR_TEST_CALLBACK_URL || "http://localhost:5001/api/complaints/test/ivr-response");
    const complaintId = String(req.query.complaintId || "demo-complaint").trim();

    if (!phone) {
      res.status(400).json({ message: "phone query param (or IVR_DEMO_PHONE env) is required" });
      return;
    }

    const result = await triggerVerificationCall({
      complaintId,
      citizenPhone: phone,
      callbackUrl
    });

    res.json(result);
  } catch (error) {
    console.error("[ERROR] Test verification call failed:", error.message);
    res.status(500).json({ message: `Test verification call failed: ${error.message}` });
  }
});

app.all("/ivr/verify", (req, res) => {
  const twiml = new VoiceResponse();
  const complaintId = String(req.body.complaintId || req.query.complaintId || "").trim();
  const callbackUrl = String(req.body.callbackUrl || req.query.callbackUrl || "").trim();
  const attempt = Number.parseInt(String(req.body.attempt || req.query.attempt || "1"), 10);
  const safeAttempt = Number.isNaN(attempt) || attempt < 1 ? 1 : attempt;
  const responseUrl = buildVerificationUrl("/ivr/verify/response", complaintId, callbackUrl, safeAttempt);

  const gather = twiml.gather({
    numDigits: 1,
    action: responseUrl,
    method: "POST",
    timeout: Number(process.env.IVR_GATHER_TIMEOUT_SECONDS || 5)
  });

  if (AUDIO_1_URL) {
    gather.play(AUDIO_1_URL);
  } else {
    gather.say(
      { language: "gu-IN", voice: "alice" },
      "નમસ્તે. તમારી ફરિયાદ માટે ચકાસણી કોલ છે. જો સમસ્યા ઉકેલાઈ હોય તો 1 દબાવો. ફરીથી ખોલવા માટે 2 દબાવો."
    );
  }

  if (safeAttempt < MAX_VERIFICATION_ATTEMPTS) {
    twiml.redirect({ method: "POST" }, buildVerificationUrl("/ivr/verify", complaintId, callbackUrl, safeAttempt + 1));
  } else {
    twiml.pause({ length: 5 });
    twiml.hangup();
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

app.all("/ivr/verify/response", async (req, res) => {
  const twiml = new VoiceResponse();
  const digits = String(req.body.Digits || req.query.Digits || "").trim();
  const complaintId = String(req.body.complaintId || req.query.complaintId || "").trim();
  const callbackUrl = decodeMaybeEncodedUri(String(req.body.callbackUrl || req.query.callbackUrl || "").trim());
  const attempt = Number.parseInt(String(req.body.attempt || req.query.attempt || "1"), 10);
  const safeAttempt = Number.isNaN(attempt) || attempt < 1 ? 1 : attempt;

  const from = String(req.body.From || req.query.From || "Unknown").trim();
  let status = "";

  if (digits === "1") {
    status = "RESOLVED";
  } else if (digits === "2") {
    status = "REOPEN";
  } else {
    status = "NO_RESPONSE";
  }

  addVerificationResponseLog({
    complaintId,
    from,
    digit: digits || "",
    status,
    attempt: safeAttempt
  });

  if (["1", "2"].includes(digits)) {
    try {
      await axios.post(
        callbackUrl,
        {
          complaintId,
          ivrResponse: digits,
          callSid: req.body.CallSid || req.query.CallSid || null,
          caller: from || null
        },
        {
          timeout: 10000,
          headers: {
            ...(process.env.IVR_CALLBACK_SECRET ? { "x-ivr-secret": process.env.IVR_CALLBACK_SECRET } : {})
          }
        }
      );
    } catch (error) {
      console.error("[ERROR] Unable to send IVR response callback:", error.message);
    }

    if (digits === "1") {
      if (AUDIO_2_URL) {
        twiml.play(AUDIO_2_URL);
      } else {
        twiml.say({ language: "gu-IN", voice: "alice" }, "આભાર. તમારી ફરિયાદ ઉકેલાઈ તરીકે નોંધાઈ છે.");
      }
    } else if (AUDIO_3_URL) {
      twiml.play(AUDIO_3_URL);
    } else {
      twiml.say({ language: "gu-IN", voice: "alice" }, "આભાર. તમારી ફરિયાદ ફરી તપાસ માટે ખોલવામાં આવી છે.");
    }

    twiml.hangup();
    res.type("text/xml");
    res.send(twiml.toString());
    return;
  }

  if (safeAttempt < MAX_VERIFICATION_ATTEMPTS) {
    twiml.redirect({ method: "POST" }, buildVerificationUrl("/ivr/verify", complaintId, callbackUrl, safeAttempt + 1));
  } else {
    twiml.pause({ length: 5 });
    twiml.hangup();
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

app.get("/api/responses", (req, res) => {
  res.json(verificationResponses);
});

app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write("data: connected\\n\\n");
  verificationSseClients.add(res);

  req.on("close", () => {
    verificationSseClients.delete(res);
  });
});

app.post("/api/test/ivr-callback", (req, res) => {
  console.log("[INFO] Test IVR callback payload:", req.body || {});
  res.status(200).json({ ok: true, message: "Test callback accepted" });
});

app.all("/menu", (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits || req.query.Digits;
  const language = getLanguageByDigit(digit);
  const callSid = req.body.CallSid || req.query.CallSid;

  if (language) {
    if (callSid) {
      callLanguageBySid.set(callSid, language);
    }
    twiml.redirect({ method: "POST" }, webhookUrl("/record"));
  } else {
    sayPrompt(twiml, "gu", "invalid_language");
    playLanguageMenu(twiml);
    twiml.redirect({ method: "POST" }, webhookUrl("/ivr"));
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

app.all("/record", (req, res) => {
  const twiml = new VoiceResponse();
  const language = getLanguageForRequest(req);
  const attempt = Number.parseInt(String(req.body.attempt || req.query.attempt || "1"), 10);
  const safeAttempt = Number.isNaN(attempt) || attempt < 1 ? 1 : attempt;

  sayPrompt(twiml, language, "start_recording");

  twiml.record({
    action: webhookUrl(`/recording?attempt=${encodeURIComponent(String(safeAttempt))}`),
    method: "POST",
    maxLength: 60,
    timeout: Number(process.env.RECORDING_SILENCE_TIMEOUT || 5),
    playBeep: true,
    finishOnKey: "#",
    trim: "trim-silence"
  });

  res.type("text/xml");
  res.send(twiml.toString());
});

app.all("/recording", (req, res) => {
  const twiml = new VoiceResponse();

  try {
    const recordingUrl = req.body.RecordingUrl || req.query.RecordingUrl;
    const recordingSid = req.body.RecordingSid || req.query.RecordingSid || "Unknown";
    const recordingDuration = req.body.RecordingDuration || req.query.RecordingDuration || "Unknown";
    const callerNumber = req.body.From || req.query.From || req.body.Caller || req.query.Caller || "Unknown";
    const callSid = req.body.CallSid || req.query.CallSid;
    const language = getLanguageForRequest(req);
    const attempt = Number.parseInt(String(req.body.attempt || req.query.attempt || "1"), 10);
    const safeAttempt = Number.isNaN(attempt) || attempt < 1 ? 1 : attempt;

    if (!recordingUrl || recordingDuration === "0") {
      if (safeAttempt < MAX_RECORDING_ATTEMPTS) {
        sayPrompt(twiml, language, "no_recording");
        twiml.redirect({ method: "POST" }, webhookUrl(`/record?attempt=${encodeURIComponent(String(safeAttempt + 1))}`));
      } else {
        sayPrompt(twiml, language, "generic_error");
        twiml.hangup();
      }

      res.type("text/xml");
      res.send(twiml.toString());
      return;
    }

    const complaint = {
      id: complaints.length + 1,
      callerNumber,
      recordingSid,
      recordingDuration,
      recordingUrl,
      language,
      transcriptionText: getPromptText(language, "processing_transcription"),
      geminiSummary: getPromptText(language, "processing_summary"),
      processingStatus: geminiEnabled ? getPromptText(language, "queued") : "AI disabled",
      createdAt: new Date().toISOString()
    };

    complaints.push(complaint);
    broadcastComplaint(complaint);

    // Persist to MongoDB
    if (mongoose.connection.readyState === 1) {
      const ivrCollection = mongoose.connection.db.collection('IVRCALLData');
      ivrCollection.insertOne({
        callerNumber,
        recordingSid,
        recordingDuration,
        recordingUrl,
        language,
        transcriptionText: complaint.transcriptionText,
        geminiSummary: complaint.geminiSummary,
        processingStatus: complaint.processingStatus,
        createdAt: new Date()
      }).catch((err) => console.warn("[WARN] Failed to save IVR call to MongoDB:", err.message));
    }

    console.log(`[INFO] Complaint saved: ${complaint.id}`);
    console.log(`[INFO] Caller number: ${callerNumber}`);
    console.log(`[INFO] Recording URL: ${recordingUrl}`);
    console.log(`[INFO] Language: ${language}`);

    enrichComplaintWithAi(complaint.id);
    if (callSid) {
      callLanguageBySid.delete(callSid);
    }

    sayPrompt(twiml, language, "confirmation");
  } catch (error) {
    console.error("[ERROR] Failed to process complaint:", error.message);

    sayPrompt(twiml, "gu", "generic_error");
    twiml.hangup();
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/", (req, res) => {
  const twiml = new VoiceResponse();
  twiml.redirect({ method: "POST" }, webhookUrl("/ivr"));
  res.type("text/xml");
  res.send(twiml.toString());
});

app.all("/ivr-response", (req, res) => {
  const twiml = new VoiceResponse();
  twiml.redirect({ method: "POST" }, webhookUrl("/ivr"));
  res.type("text/xml");
  res.send(twiml.toString());
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

app.get("/status", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "IVR server is running.",
    mode: geminiEnabled ? "twilio+gemini" : "twilio-only",
    geminiEnabled: geminiEnabled && Boolean(geminiClient),
    twilioPhone: process.env.TWILIO_PHONE || "Not configured",
    twilioWebhook: "/ivr",
    method: "POST"
  });
});

app.get("/complaints", (req, res) => {
  res.json({ count: complaints.length, complaints });
});

app.get("/api/complaints", (req, res) => {
  res.json({ count: complaints.length, complaints });
});

app.get("/api/recordings/:recordingSid/audio", async (req, res) => {
  try {
    const { recordingSid } = req.params;
    const complaint = complaints.find((item) => item.recordingSid === recordingSid);

    if (!complaint?.recordingUrl) {
      res.status(404).json({ error: "Recording not found." });
      return;
    }

    const response = await axios.get(`${complaint.recordingUrl}.mp3`, {
      responseType: "stream",
      timeout: 15000,
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      }
    });

    res.setHeader("Content-Type", "audio/mpeg");
    response.data.pipe(res);
  } catch (error) {
    console.error("[ERROR] Unable to stream recording audio:", error.message);
    res.status(500).json({ error: "Unable to stream recording audio." });
  }
});

app.get("/tts/prompt/:language/:promptKey", async (req, res) => {
  try {
    const { language, promptKey } = req.params;
    const selected = languageConfig[language] || languageConfig.gu;
    const text = getPromptText(language, promptKey);
    const cacheKey = `${language}:${promptKey}`;

    if (!text) {
      res.status(404).json({ error: "Prompt not found." });
      return;
    }

    if (!promptAudioCache.has(cacheKey)) {
      const response = await axios.get("https://translate.google.com/translate_tts", {
        responseType: "arraybuffer",
        timeout: 15000,
        params: {
          ie: "UTF-8",
          client: "tw-ob",
          tl: selected.ttsLang,
          q: text
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        }
      });

      promptAudioCache.set(cacheKey, Buffer.from(response.data));
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(promptAudioCache.get(cacheKey));
  } catch (error) {
    console.error("[ERROR] Unable to generate Gujarati prompt audio:", error.message);
    res.status(500).json({ error: "Unable to generate prompt audio." });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`[INFO] IVR server is running on http://localhost:${PORT}`);
});
