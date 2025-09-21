**To update an ingest configuration**

The following ``update-inegst-configuration`` example updates an ingest configuration to attach it to a stage. ::

    aws ivs-realtime update-ingest-configuration \
        --arn arn:aws:ivs:us-west-2:123456789012:ingest-configuration/AbCdEfGh1234 \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh

Output::

    {
        "ingestConfiguration": {
            "name": "ingest1",
            "arn": "arn:aws:ivs:us-west-2:123456789012:ingest-configuration/AbCdEfGh1234",
            "ingestProtocol": "RTMPS",
            "streamKey": "rt_123456789012_us-west-2_AbCdEfGh1234_abcd1234efgh5678ijkl9012MNOP34",
            "stageArn": "arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh",
            "participantId": "xyZ654abC321",
            "state": "INACTIVE",
            "userId": "",
            "tags": {}
        }
    }

For more information, see `IVS Stream Ingest | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-stream-ingest.html>`__ in the *Amazon Interactive Video Service User Guide*.
