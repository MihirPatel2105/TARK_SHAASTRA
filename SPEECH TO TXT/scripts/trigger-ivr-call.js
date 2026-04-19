require("dotenv").config();

const axios = require("axios");

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = { complaintId: null, citizenPhone: null, simulateResponse: null };

  for (const arg of args) {
    if (arg.startsWith("--response=")) {
      options.simulateResponse = arg.split("=")[1] || null;
    } else if (arg.startsWith("--mark=")) {
      options.simulateResponse = arg.split("=")[1] || null;
    } else if (!options.complaintId) {
      options.complaintId = arg;
    } else if (!options.citizenPhone) {
      options.citizenPhone = arg;
    }
  }

  return options;
}

function normalizePhoneNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return raw;
}

async function run() {
  const { complaintId, citizenPhone: inputPhone, simulateResponse } = parseArgs(process.argv);

  if (!complaintId) {
    console.error("Usage: npm run trigger:ivr -- <complaintId> [citizenPhone] [--response=1|2]");
    process.exitCode = 1;
    return;
  }

  const baseUrl = process.env.IVR_SERVICE_BASE_URL || "http://localhost:3001";
  const callbackUrl =
    process.env.IVR_TEST_CALLBACK_URL ||
    `http://localhost:5001/api/complaints/${encodeURIComponent(complaintId)}/ivr-response`;

  const payload = {
    complaintId,
    citizenPhone: normalizePhoneNumber(inputPhone || process.env.IVR_DEMO_PHONE || "9662876737"),
    callbackUrl
  };

  console.log("Triggering IVR call with payload:");
  console.log(payload);

  const response = await axios.post(`${baseUrl}/api/verification/call`, payload, {
    timeout: 20000
  });

  console.log("\nService response:");
  console.log(response.data);

  if (response.data && response.data.citizenPhone) {
    console.log(`\nResolved call target: ${response.data.citizenPhone}`);
  }

  if (simulateResponse) {
    const callbackBody = {
      complaintId,
      ivrResponse: String(simulateResponse).trim(),
      callSid: response.data?.callSid || null,
      caller: payload.citizenPhone
    };

    console.log("\nSimulating IVR callback:");
    console.log(callbackBody);

    const callbackResponse = await axios.post(callbackUrl, callbackBody, {
      timeout: 20000,
      headers: {
        ...(process.env.IVR_CALLBACK_SECRET ? { "x-ivr-secret": process.env.IVR_CALLBACK_SECRET } : {})
      }
    });

    console.log("\nCallback response:");
    console.log(callbackResponse.data);
  }
}

run().catch((error) => {
  const data = error.response?.data;
  console.error("IVR trigger failed:", data || error.message);
  process.exitCode = 1;
});
