# Receiving and Testing Emails

## Local email

The normal development environment starts Mailpit with Ghost. Run:

```bash
pnpm dev
```

Emails sent by the development site are captured at
[http://localhost:8025](http://localhost:8025) rather than delivered. The Docker
development configuration connects Ghost to Mailpit automatically.

## Testing with Mailgun

For testing transactional email delivery, configure Ghost's `mail` setting with
an SMTP provider. For testing newsletter delivery, configure the separate
Mailgun settings used by Ghost's bulk email service. Mailgun sandbox domains
only send to recipients that have been added and verified in Mailgun.

Keep credentials in your local configuration and do not commit them.

Most development does not need real delivery. Use Mailpit unless the behavior
being tested depends on the external provider.
