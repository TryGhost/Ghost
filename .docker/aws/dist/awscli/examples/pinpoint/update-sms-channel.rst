**To enable SMS channel or to update the status and settings of the SMS channel for an application.**

The following ``update-sms-channel`` example enables SMS channel for an SMS channel for an application. ::

    aws pinpoint update-sms-channel \
        --application-id 611e3e3cdd47474c9c1399a505665b91 \
        --sms-channel-request Enabled=true \
        --region us-west-2

Output::

    {
        "SMSChannelResponse": {
            "ApplicationId": "611e3e3cdd47474c9c1399a505665b91",
            "CreationDate": "2019-01-28T23:25:25.224Z",
            "Enabled": true,
            "Id": "sms",
            "IsArchived": false,
            "LastModifiedDate": "2023-05-18T23:22:50.977Z",
            "Platform": "SMS",
            "PromotionalMessagesPerSecond": 20,
            "TransactionalMessagesPerSecond": 20,
            "Version": 3
        }
    }

For more information, see `Amazon Pinpoint SMS channel <https://docs.aws.amazon.com/pinpoint/latest/userguide/channels-sms.html>`__ in the *Amazon Pinpoint User Guide*.