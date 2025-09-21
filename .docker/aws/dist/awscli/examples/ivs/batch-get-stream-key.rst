**To get information about multiple stream keys**

The following ``batch-get-stream-key`` example gets information about the specified stream keys. ::

    aws ivs batch-get-stream-key \
        --arns arn:aws:ivs:us-west-2:123456789012:stream-key/skSKABCDefgh \
           arn:aws:ivs:us-west-2:123456789012:stream-key/skSKIJKLmnop

Output::

    {
        "streamKeys": [
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:stream-key/skSKABCDefgh",
                "value": "sk_us-west-2_abcdABCDefgh_567890abcdef",
                "channelArn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
                "tags": {}
            },
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:stream-key/skSKIJKLmnop",
                "value": "sk_us-west-2_abcdABCDefgh_567890ghijkl",
                "channelArn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
                "tags": {}
            }
         ]
    }

For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.