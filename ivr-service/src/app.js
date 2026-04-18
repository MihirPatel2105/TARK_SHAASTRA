require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ivrRoutes = require('./routes/ivrRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.use('/api/ivr', ivrRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
