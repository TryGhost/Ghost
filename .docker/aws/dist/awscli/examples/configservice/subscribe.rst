**To subscribe to AWS Config**

The following command creates the default delivery channel and configuration recorder. The command also specifies the Amazon S3 bucket and Amazon SNS topic to which AWS Config will deliver configuration information::

    aws configservice subscribe --s3-bucket config-bucket-123456789012 --sns-topic arn:aws:sns:us-east-1:123456789012:config-topic --iam-role arn:aws:iam::123456789012:role/ConfigRole-A1B2C3D4E5F6

Output::

    Using existing S3 bucket: config-bucket-123456789012
    Using existing SNS topic: arn:aws:sns:us-east-1:123456789012:config-topic
    Subscribe succeeded:

    Configuration Recorders: [
        {
            "recordingGroup": {
                "allSupported": true,
                "resourceTypes": [],
                "includeGlobalResourceTypes": false
            },
            "roleARN": "arn:aws:iam::123456789012:role/ConfigRole-A1B2C3D4E5F6",
            "name": "default"
        }
    ]

    Delivery Channels: [
        {
            "snsTopicARN": "arn:aws:sns:us-east-1:123456789012:config-topic",
            "name": "default",
            "s3BucketName": "config-bucket-123456789012"
        }
    ]