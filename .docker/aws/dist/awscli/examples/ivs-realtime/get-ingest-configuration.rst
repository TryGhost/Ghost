**To get ingest configuration information**

The following ``get-ingest-configuration`` example gets the ingest configuration for a specified ingest-configuration ARN (Amazon Resource Name). ::

    aws ivs-realtime get-ingest-configuration \
        --arn arn:aws:ivs:us-west-2:123456789012:ingest-configuration/AbCdEfGh1234

Output::

    {
        "ingestConfiguration": {
            "name": "ingest1",
            "arn": "arn:aws:ivs:us-west-2:123456789012:ingest-configuration/AbCdEfGh1234",
            "ingestProtocol": "RTMPS",
            "streamKey": "rt_123456789012_us-west-2_AbCdEfGh1234_abcd1234efgh5678ijkl9012MNOP34",
            "stageArn": "",
            "participantId": "xyZ654abC321",
            "state": "INACTIVE",
            "userId": "",
            "tags": {}
        }
    }

For more information, see `IVS Stream Ingest | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-stream-ingest.html>`__ in the *Amazon Interactive Video Service User Guide*.
