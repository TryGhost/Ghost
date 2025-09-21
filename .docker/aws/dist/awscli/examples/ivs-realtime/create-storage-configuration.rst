**To create a composition storage configuration**

The following ``create-storage-configuration`` example creates a composition storage configuration with the specified properties. ::

    aws ivs-realtime create-storage-configuration \
        --name "test-sc" --s3 "bucketName=amzn-s3-demo-bucket"

Output::

    {
        "storageConfiguration": {
            "arn": "arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/ABabCDcdEFef",
            "name": "test-sc",
            "s3": {
                "bucketName": "amzn-s3-demo-bucket"
            },
            "tags": {}
        }
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon Interactive Video Service User Guide*.