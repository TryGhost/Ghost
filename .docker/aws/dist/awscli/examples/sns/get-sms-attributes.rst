**To list the default SMS message attributes**

The following ``get-sms-attributes`` example lists the default attributes for sending SMS messages. ::

    aws sns get-sms-attributes

Output::

    {
        "attributes": {
            "DefaultSenderID": "MyName"
        }
    }
