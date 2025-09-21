**To retrieve information about the status and settings of the SMS channel for an application**

The following ``get-sms-channel`` example retrieves status and settings of the sms channel for an application. ::

    aws pinpoint get-sms-channel \
        --application-id 6e0b7591a90841d2b5d93fa11143e5a7 \
        --region us-east-1

Output::

    {
        "SMSChannelResponse": {
            "ApplicationId": "6e0b7591a90841d2b5d93fa11143e5a7",
            "CreationDate": "2019-10-08T18:39:18.511Z",
            "Enabled": true,
            "Id": "sms",
            "IsArchived": false,
            "LastModifiedDate": "2019-10-08T18:39:18.511Z",
            "Platform": "SMS",
            "PromotionalMessagesPerSecond": 20,
            "TransactionalMessagesPerSecond": 20,
            "Version": 1
        }
    }