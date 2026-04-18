const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const complaintRoutes = require('./routes/complaintRoutes');
const userRoutes = require('./routes/userRoutes');
const officerRoutes = require('./routes/officerRoutes');
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
app.use('/api/users', userRoutes);
app.use('/api/officer', officerRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
