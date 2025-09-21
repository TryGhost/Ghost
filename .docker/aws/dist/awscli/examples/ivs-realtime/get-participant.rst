**Example 1: To get a stage participant**

The following ``get-participant`` example gets the stage participant for a specified participant ID and session ID in the specified stage ARN (Amazon Resource Name). ::

    aws ivs-realtime get-participant \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --session-id st-a1b2c3d4e5f6g \
        --participant-id abCDEf12GHIj

Output::

    {
        "participant": {
            "browserName": "Google Chrome",
            "browserVersion": "116",
            "firstJoinTime": "2023-04-26T20:30:34+00:00",
            "ispName": "Comcast",
            "osName": "Microsoft Windows 10 Pro",
            "osVersion": "10.0.19044",
            "participantId": "abCDEf12GHIj",
            "published": true,
            "recordingS3BucketName": "bucket-name",
            "recordingS3Prefix": "abcdABCDefgh/st-a1b2c3d4e5f6g/abCDEf12GHIj/1234567890",
            "recordingState": "ACTIVE",
            "sdkVersion": "",
            "state": "CONNECTED",
            "userId": ""
        }
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.

**Example 2: To get a stage participant that has been replicated to another stage**

The following ``get-participant`` example gets the stage participant for a specified participant ID and session ID in the specified stage ARN (Amazon Resource Name), when the participant has also been replicated to another stage. ::

    aws ivs-realtime get-participant \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --session-id st-a1b2c3d4e5f6g \
        --participant-id abCDEf12GHIj

Output::

    {
        "participant": {
            "browserName": "Google Chrome",
            "browserVersion": "116",
            "firstJoinTime": "2023-04-26T20:30:34+00:00",
            "ispName": "Comcast",
            "osName": "Microsoft Windows 10 Pro",
            "osVersion": "10.0.19044",
            "participantId": "abCDEf12GHIj",
            "published": true,
            "recordingS3BucketName": "bucket-name",
            "recordingS3Prefix": "abcdABCDefgh/st-a1b2c3d4e5f6g/abCDEf12GHIj/1234567890",
            "recordingState": "ACTIVE",
            "replicationState": "ACTIVE",
            "replicationType": "SOURCE",
            "sdkVersion": "",
            "state": "CONNECTED",
            "userId": ""
        }
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.

**Example 3: To get a stage participant that has been replicated from another stage**

The following ``get-participant`` example gets the stage participant for a specified participant ID and session ID in the specified stage ARN (Amazon Resource Name), when the participant has been replicated from another stage. ::

    aws ivs-realtime get-participant \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --session-id st-a1b2c3d4e5f6g \
        --participant-id abCDEf12GHIj

Output::

    {
        "participant": {
            "browserName": "Google Chrome",
            "browserVersion": "116",
            "firstJoinTime": "2023-04-26T20:30:34+00:00",
            "ispName": "Comcast",
            "osName": "Microsoft Windows 10 Pro",
            "osVersion": "10.0.19044",
            "participantId": "abCDEf12GHIj",
            "published": true,
            "recordingS3BucketName": "bucket-name",
            "recordingS3Prefix": "abcdABCDefgh/st-a1b2c3d4e5f6g/abCDEf12GHIj/1234567890",
            "recordingState": "ACTIVE",
            "replicationState": "ACTIVE",
            "replicationType": "REPLICA",
            "sdkVersion": "",
            "state": "CONNECTED",
            "userId": ""
        }
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.
