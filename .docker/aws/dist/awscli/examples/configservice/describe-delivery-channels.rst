**To get details about the delivery channel**

The following command returns details about the delivery channel::

    aws configservice describe-delivery-channels

Output::

    {
        "DeliveryChannels": [
            {
                "snsTopicARN": "arn:aws:sns:us-east-1:123456789012:config-topic",
                "name": "default",
                "s3BucketName": "config-bucket-123456789012"
            }
        ]
    }