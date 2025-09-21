**To list all the RecordingConfiguration resources created in this account**

The following ``list-recording-configurations`` example gets information about all RecordingConfiguration resources in your account. ::

    aws ivs list-recording-configurations

Output::

    {
        "recordingConfigurations": [
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:recording-configuration/ABcdef34ghIJ",
                "name": "test-recording-config-1",
                "destinationConfiguration": {
                    "s3": {
                        "bucketName": "demo-recording-bucket-1"
                    }
                },
                "state": "ACTIVE",
                "tags": {}
            },
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:recording-configuration/CD12abcdGHIJ",
                "name": "test-recording-config-2",
                "destinationConfiguration": {
                    "s3": {
                        "bucketName": "demo-recording-bucket-2"
                    }
                },
                "state": "ACTIVE",
                "tags": {}
            }
        ]
    }

For more information, see `Record to Amazon S3 <https://docs.aws.amazon.com/ivs/latest/userguide/record-to-s3.html>`__ in the *Amazon Interactive Video Service User Guide*.