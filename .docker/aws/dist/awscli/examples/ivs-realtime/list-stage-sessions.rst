**To get a list of stage sessions**

The following ``list-stage-sessions`` example lists all sessions for a specified stage ARN (Amazon Resource Name). ::

    aws ivs-realtime list-stage-sessions \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh

Output::

    {
        "stageSessions": [
            {
                "endTime": "2023-04-26T20:36:29+00:00",
                "sessionId": "st-a1b2c3d4e5f6g",
                "startTime": "2023-04-26T20:30:29.602000+00:00"
            }
        ]
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/userguide/multiple-hosts.html>`__ in the *Amazon Interactive Video Service User Guide*.