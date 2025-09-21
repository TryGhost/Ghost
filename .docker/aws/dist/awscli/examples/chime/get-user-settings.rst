**To retrieve user settings**

The following ``get-user-settings`` example displays the specified user settings. ::

    aws chime get-user-settings \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --user-id 1ab2345c-67de-8901-f23g-45h678901j2k

Output::

    {
        "UserSettings": {
            "Telephony": {
                "InboundCalling": true,
                "OutboundCalling": true,
                "SMS": true
            }
        }
    }

For more information, see `Managing User Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/user-phone.html>`__ in the *Amazon Chime Administration Guide*.
