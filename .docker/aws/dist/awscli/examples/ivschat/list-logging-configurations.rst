**To get summary information about all logging configurations for the user in the AWS region where the API request is processed**

The following ``list-logging-configurations`` example lists information about all LoggingConfiguration resources for the user in the AWS region where the API request is processed. ::

    aws ivschat list-logging-configurations \
        --max-results 2 \
        --next-token ""

Output::

    {
        "nextToken": "set-2",
        "loggingConfigurations": [
            {
                "arn": "arn:aws:ivschat:us-west-2:123456789012:logging-configuration/ABcdef34ghIJ",
                "createTime": "2022-09-14T17:48:00.653000+00:00",
                "destinationConfiguration": {
                    "s3": {
                        "bucketName": "demo-logging-bucket"
                    }
                },
                "id": "ABcdef34ghIJ",
                "name": "test-logging-config",
                "state": "ACTIVE",
                "tags": { "key1" : "value1", "key2" : "value2" },
                "updateTime": "2022-09-14T17:48:01.104000+00:00"
            }
            ...
        ]
    }

For more information, see `Getting Started with Amazon IVS Chat <https://docs.aws.amazon.com/ivs/latest/userguide/getting-started-chat.html>`__ in the *Amazon Interactive Video Service User Guide*.