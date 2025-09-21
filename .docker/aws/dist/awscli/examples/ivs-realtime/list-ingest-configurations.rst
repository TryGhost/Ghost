**To get summary information about all ingest configurations**

The following ``list-ingest-configurations`` example lists all ingest configurations for your AWS account, in the AWS region where the API request is processed. ::

    aws ivs-realtime list-ingest-configurations

Output::

    {
        "ingestConfigurations": [
            {
                "name": "",
                "arn": "arn:aws:ivs:us-west-2:123456789012:ingest-configuration/XYZuvwSt4567",
                "ingestProtocol": "RTMPS",
                "stageArn": "arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh",
                "participnatId": "abC789Xyz456",
                "state": "INACTIVE"
                "userId": "",
            }
        ]
    }

For more information, see `IVS Stream Ingest | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-stream-ingest.html>`__ in the *Amazon Interactive Video Service User Guide*.
