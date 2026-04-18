const twilio = require('twilio');

function validateTwilioSignature(req, res, next) {
  if (String(process.env.DISABLE_TWILIO_SIGNATURE).toLowerCase() === 'true') {
    return next();
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.header('x-twilio-signature');
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  if (!authToken || !signature) {
    res.status(403);
    return next(new Error('Twilio signature validation failed'));
  }

  const isValid = twilio.validateRequest(authToken, signature, url, req.body);
  if (!isValid) {
    res.status(403);
    return next(new Error('Invalid Twilio signature'));
  }

  return next();
}

module.exports = validateTwilioSignature;
