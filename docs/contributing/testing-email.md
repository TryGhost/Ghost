# Receiving and Testing Emails

## Local email

Install MailDev globally:

```bash
npm install -g maildev
maildev
```

MailDev starts an SMTP server and a web interface at
[http://localhost:1080](http://localhost:1080). Configure Ghost to send mail to
the local SMTP server:

```json
{
    "mail": {
        "transport": "SMTP",
        "options": {
            "host": "localhost",
            "port": 1025
        }
    }
}
```

Emails sent by Ghost will appear in the MailDev interface rather than being
delivered.

## Testing with Mailgun

For testing real delivery, create a Mailgun account and configure Ghost with
the SMTP credentials for a Mailgun domain. Sandbox domains only send to
authorized recipients, which must be added and verified in Mailgun first.

Keep credentials in your local configuration and do not commit them.
