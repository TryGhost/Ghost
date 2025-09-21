**Example 1: To get a list of stage participant events**

The following ``list-participant-events`` example lists all participant events for a specified participant ID and session ID of a specified stage ARN (Amazon Resource Name). ::

    aws ivs-realtime list-participant-events \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --session-id st-a1b2c3d4e5f6g \
        --participant-id abCDEf12GHIj

Output::

    {
        "events": [
            {
                "eventTime": "2023-04-26T20:36:28+00:00",
                "name": "LEFT",
                "participantId": "abCDEf12GHIj"
            },
            {
                "eventTime": "2023-04-26T20:36:28+00:00",
                "name": "PUBLISH_STOPPED",
                "participantId": "abCDEf12GHIj"
            },
            {
                "eventTime": "2023-04-26T20:30:34+00:00",
                "name": "JOINED",
                "participantId": "abCDEf12GHIj"
            },
            {
                "eventTime": "2023-04-26T20:30:34+00:00",
                "name": "PUBLISH_STARTED",
                "participantId": "abCDEf12GHIj"
            }
        ]
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.

**Example 2: To get a list of stage participant events, including participant replication stop and start**

The following ``list-participant-events`` example lists all participant events for a specified session ID of a specified stage ARN (Amazon Resource Name), where a participant is replicated to another stage. ::

    aws ivs-realtime list-participant-events \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --session-id st-a1b2c3d4e5f6g \
        --participant-id abCDEf12GHIj

Output::

    {
        "events": [
            {
                "eventTime": "2025-04-26T20:36:28+00:00",
                "name": "LEFT",
                "participantId": "abCDEf12GHIj"
            },
            {
                "eventTime": "2025-04-26T20:36:28+00:00",
                "name": "PUBLISH_STOPPED",
                "participantId": "abCDEf12GHIj"
            },
            {
                "eventTime": "2025-04-26T20:30:34+00:00",
                "name": "JOINED",
                "participantId": "abCDEf12GHIj"
            },
            {
                "eventTime": "2025-04-26T20:30:34+00:00",
                "name": "PUBLISH_STARTED",
                "participantId": "abCDEf12GHIj"
            },
            {
                "name": "REPLICATION_STARTED",
                "participantId": "abCDEf12GHIj",
                "eventTime": "2025-04-26T20:30:34+00:00",
                "destinationStageArn": "arn:aws:ivs:us-west-2:12345678901:stage/ABCDabcdefgh",
                "destinationSessionId": "st-b1c2d3e4f5g6a"
            },
            {
                "name": "REPLICATION_STOPPED",
                "participantId": "abCDEf12GHIj",
                "eventTime": "2025-04-26T20:32:34+00:00",
                "destinationStageArn": "arn:aws:ivs:us-west-2:12345678901:stage/ABCDabcdefgh",
                "destinationSessionId": "st-b1c2d3e4f5g6a"
            }
        ]
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.