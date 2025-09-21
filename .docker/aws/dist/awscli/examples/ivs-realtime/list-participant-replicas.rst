**To get a list of stage participant replicas**

The following ``list-participant-replicas`` example lists all stage participants replicated from the specified source stage ARN (Amazon Resource Name) to another stage. ::

    aws ivs-realtime list-participant-replicas \
        --source-stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --participant-id abCDEf12GHIj

Output::

    {
        "replicas": [
            {
                "sourceStageArn": "arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh",
                "participantId": "abCDEf12GHIj",
                "sourceSessionId": "st-a1b2c3d4e5f6g",
                "destinationStageArn": "arn:aws:ivs:us-west-2:012345678901:stage/ABCDabcdefgh",
                "destinationSessionId": "st-b1c2d3e4f5g6a",
                "replicationState": "ACTIVE"
            }
        ]
    }

For more information, see `IVS Participant Replication <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-participant-replication.html>`__ in the *Amazon IVS Real-Time Streaming User Guide*.