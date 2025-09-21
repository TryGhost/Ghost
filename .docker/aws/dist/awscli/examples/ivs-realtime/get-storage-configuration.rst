**To get a composition storage configuration**

The following ``get-storage-configuration`` example gets the composition storage configuration specified by the given ARN (Amazon Resource Name). ::

    aws ivs-realtime get-storage-configuration \
        --name arn "arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/abcdABCDefgh"

Output::

    {
        "storageConfiguration": {
            "arn": "arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/abcdABCDefgh",
            "name": "test-sc",
            "s3": {
                "bucketName": "amzn-s3-demo-bucket"
            },
            "tags": {}
        }
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon Interactive Video Service User Guide*.