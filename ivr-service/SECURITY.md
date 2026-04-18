# Security Notes

Sensitive credentials were shared in chat. Rotate them immediately in Twilio console:

1. Regenerate Auth Token
2. Restrict and verify caller IDs
3. Update `.env` with new secrets
4. Never commit credentials to git
