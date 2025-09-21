**To get information about a stream**

The following ``get-stream`` example gets information about the stream for the specified channel. ::

    aws ivs get-stream \
        --channel-arn arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh

Output::

    {
        "stream": {
            "channelArn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
            "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel.abcdEFGH.m3u8",
            "startTime": "2020-05-05T21:55:38Z",
            "state": "LIVE",
            "health": "HEALTHY",
            "streamId": "st-ABCDEfghij01234KLMN5678",
            "viewerCount": 1
        }
    }

For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.