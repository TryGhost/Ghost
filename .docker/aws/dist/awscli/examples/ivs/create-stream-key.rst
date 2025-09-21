**To create a stream key**

The following ``create-stream-key`` example creates a stream key for a specified ARN (Amazon Resource Name). ::

    aws ivs create-stream-key \
        --channel-arn arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh

Output::

    {
        "streamKey": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:stream-key/abcdABCDefgh",
            "value": "sk_us-west-2_abcdABCDefgh_567890abcdef",
            "channelArn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
            "tags": {}
        }
    }

For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.