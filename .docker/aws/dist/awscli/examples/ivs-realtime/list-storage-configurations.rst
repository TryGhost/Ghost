**To list composition storage configurations**

The following ``list-storage-configurations`` lists all composition storage configurations for your AWS account, in the AWS region where the API request is processed. ::

    aws ivs-realtime list-storage-configurations

Output::

    {  
        "storageConfigurations": [
            {
                "arn": "arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/abcdABCDefgh",
                "name": "test-sc-1",
                "s3": {
                    "bucketName": "amzn-s3-demo-bucket-1"
                },
                "tags": {}
            },
            {
                "arn": "arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/ABCefgEFGabc",
                "name": "test-sc-2",
                "s3": {
                    "bucketName": "amzn-s3-demo-bucket-2"
                },
                "tags": {}
            }
        ]
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon Interactive Video Service User Guide*.