**To retrieve emergency e-mail addresses that you have on file with the DRT**

The following ``describe-emergency-contact-settings`` example retrieves the e-mail addresses that are on file with the DRT for the account. These are the addresses the DRT should contact when it's responding to a suspected attack. ::

    aws shield describe-emergency-contact-settings

Output::

    {
        "EmergencyContactList": [
            {
                "EmailAddress": "ops@example.com"
            },
            {
                "EmailAddress": "ddos-notifications@example.com"
           }
        ]
    }

For more information, see `How AWS Shield Works<https://docs.aws.amazon.com/waf/latest/developerguide/ddos-overview.html>`__ in the *AWS Shield Advanced Developer Guide*.
