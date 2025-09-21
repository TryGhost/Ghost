**To get a list of stream keys**

The following ``list-stream-keys`` example lists all stream keys for a specified ARN (Amazon Resource Name). ::

    aws ivs list-stream-keys \
        --channel-arn arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh

Output::

    {
        "streamKeys": [
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:stream-key/abcdABCDefgh",
                "channelArn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
                "tags": {}
            }
        ]
    }

FFor more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.