require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5001;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`IVR service running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start IVR service:', error);
  process.exit(1);
});
