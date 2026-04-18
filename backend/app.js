const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const complaintRoutes = require('./routes/complaintRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const officerRoutes = require('./routes/officerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ivrRoutes = require('./routes/ivrRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) : '*'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/complaints', complaintRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ivr', ivrRoutes);

try {
  // Keep backend usable when optional IVR/Twilio dependencies are not installed.
  // eslint-disable-next-line global-require
  const { ivrRouter } = require('./IVR/iver');
  app.use('/', ivrRouter);
} catch (error) {
  console.warn('IVR routes disabled:', error.message);
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
