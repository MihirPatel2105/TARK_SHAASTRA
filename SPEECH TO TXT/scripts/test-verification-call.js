require("dotenv").config();

const axios = require("axios");

async function run() {
  const baseUrl = process.env.IVR_SERVICE_BASE_URL || "http://localhost:3001";
  const callbackUrl =
    process.env.IVR_TEST_CALLBACK_URL ||
    "http://localhost:3001/api/test/ivr-callback";

  // Deliberately use a different number here to verify IVR_DEMO_PHONE override.
  const payload = {
    complaintId: `demo-${Date.now()}`,
    citizenPhone: "9999999999",
    callbackUrl
  };

  console.log("Triggering verification call with payload:");
  console.log(payload);

  const response = await axios.post(`${baseUrl}/api/verification/call`, payload, {
    timeout: 20000
  });

  console.log("\nService response:");
  console.log(response.data);

  if (response.data && response.data.citizenPhone) {
    console.log(`\nResolved call target: ${response.data.citizenPhone}`);
  }
}

run().catch((error) => {
  const data = error.response?.data;
  console.error("Verification test failed:", data || error.message);
  process.exitCode = 1;
});
