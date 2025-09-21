**To update a room's logging configuration**

The following ``update-logging-configuration`` example updates a LoggingConfiguration resource with the given data. ::

    aws ivschat update-logging-configuration \
        --destination-configuration s3={bucketName=demo-logging-bucket} \
        --identifier "arn:aws:ivschat:us-west-2:123456789012:logging-configuration/ABcdef34ghIJ" \
        --name "test-logging-config"

Output::

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

For more information, see `Getting Started with Amazon IVS Chat <https://docs.aws.amazon.com/ivs/latest/userguide/getting-started-chat.html>`__ in the *Amazon Interactive Video Service User Guide*.