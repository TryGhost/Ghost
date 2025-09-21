**To create a chat LoggingConfiguration resource**

The following ``create-logging-configuration`` example creates a LoggingConfiguration resource that allows clients to store and record sent messages. ::

    aws ivschat create-logging-configuration \
        --destination-configuration s3={bucketName=demo-logging-bucket} \
        --name "test-logging-config" \
        --tags "key1=value1, key2=value2"


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