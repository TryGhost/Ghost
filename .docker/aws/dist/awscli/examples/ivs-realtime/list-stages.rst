**To get summary information about all stages**

The following ``list-stages`` example lists all stages for your AWS account, in the AWS region where the API request is processed. ::

    aws ivs-realtime list-stages

Output::

    {
        "stages": [
            {
                "activeSessionId": "st-a1b2c3d4e5f6g",
                "arn": "arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh",
                "name": "stage1",
                "tags": {}
            },
            {
                "activeSessionId": "st-a123bcd456efg",
                "arn": "arn:aws:ivs:us-west-2:123456789012:stage/abcd1234ABCD",
                "name": "stage2",
                "tags": {}
            },
            {
                "activeSessionId": "st-abcDEF1234ghi",
                "arn": "arn:aws:ivs:us-west-2:123456789012:stage/ABCD1234efgh",
                "name": "stage3",
                "tags": {}
            }
        ]
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon Interactive Video Service User Guide*.