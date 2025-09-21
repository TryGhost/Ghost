**To retrieve information about the status and settings of the Email channel for an application**

The following ``get-email-channel`` example retrieves status and settings of the Email channel for an application. ::

    aws pinpoint get-email-channel \
        --application-id 6e0b7591a90841d2b5d93fa11143e5a7 \
        --region us-east-1

Output::

    {
        "EmailChannelResponse": {
            "ApplicationId": "6e0b7591a90841d2b5d93fa11143e5a7",
            "CreationDate": "2019-10-08T18:27:23.990Z",
            "Enabled": true,
            "FromAddress": "sender@example.com",
            "Id": "email",
            "Identity": "arn:aws:ses:us-east-1:AIDACKCEVSQ6C2EXAMPLE:identity/sender@example.com",
            "IsArchived": false,
            "LastModifiedDate": "2019-10-08T18:27:23.990Z",
            "MessagesPerSecond": 1,
            "Platform": "EMAIL",
            "RoleArn": "arn:aws:iam::AIDACKCEVSQ6C2EXAMPLE:role/pinpoint-events",
            "Version": 1
        }
    }