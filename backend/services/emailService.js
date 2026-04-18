const nodemailer = require('nodemailer');

function createTransport() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: String(EMAIL_SECURE).toLowerCase() === 'true',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
}

async function sendEmail({ to, subject, text, html }) {
  const transport = createTransport();
  if (!transport) {
    console.warn('[emailService] SMTP is not configured. Email was not sent for:', to);
    return { messageId: null, skipped: true };
  }

  return transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text,
    html
  });
}

module.exports = {
  sendEmail
};
