**To get a summary of current and previous streams for a specified channel in the current AWS region**

The following ``list-stream-sessions`` example reports summary information for streams for a specified channel ARN (Amazon Resource Name). ::

    aws ivs list-stream-sessions \
        --channel-arn arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh \
        --max-results 25 \
        --next-token ""

Output::

    {
        "nextToken": "set-2",
        "streamSessions": [
            {
                "startTime": 1641578182,
                "endTime": 1641579982,
                "hasErrorEvent": false,
                "streamId": "mystream"
            }
            ...
        ]
    }
    
For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.