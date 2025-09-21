**Example 1: To get a list of stage participants**

The following ``list-participants`` example lists all participants for a specified session ID of a specified stage ARN (Amazon Resource Name). ::

    aws ivs-realtime list-participants \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --session-id st-a1b2c3d4e5f6g

Output::

    {
        "participants": [
            {
                "firstJoinTime": "2023-04-26T20:30:34+00:00",
                "participantId": "abCDEf12GHIj",
                "published": true,
                "recordingState": "STOPPED",
                "state": "DISCONNECTED",
                "userId": ""
            }
        ]
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.

**Example 2: To get a list of stage participants, when a participant has been replicated to another stage**

The following ``list-participants`` example lists all participants for a specified session ID of a specified stage ARN (Amazon Resource Name), when a participant has been replicated to another stage. ::

    aws ivs-realtime list-participants \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --session-id st-a1b2c3d4e5f6g

Output::

    {
        "participants": [
            {
                "firstJoinTime": "2023-04-26T20:30:34+00:00",
                "participantId": "abCDEf12GHIj",
                "published": true,
                "recordingState": "STOPPED",
                "state": "DISCONNECTED",
                "userId": "",
                "replicationState": "ACTIVE",
                "replicationType": "SOURCE",
                "sourceStageArn": "",
                "sourceSessionId": ""
            }
        ]
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.

**Example 3: To get a list of stage participants, when a participant has been replicated from another stage**

The following ``list-participants`` example lists all participants for a specified session ID of a specified stage ARN (Amazon Resource Name), when a participant has been replicated from another stage. ::

    aws ivs-realtime list-participants \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --session-id st-a1b2c3d4e5f6g

Output::

    {
        "participants": [
            {
                "firstJoinTime": "2023-04-26T20:30:34+00:00",
                "participantId": "abCDEf12GHIj",
                "published": true,
                "recordingState": "STOPPED",
                "state": "DISCONNECTED",
                "userId": "",
                "replicationState": "ACTIVE",
                "replicationType": "REPLICA",
                "sourceStageArn": "arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh",
                "sourceSessionId": "st-a1b2c3d4e5f6g"
            }
        ]
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.