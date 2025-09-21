**To get a channel's configuration information**

The following ``get-channel`` example gets the channel configuration for a specified channel ARN (Amazon Resource Name). ::

    aws ivs get-channel \
        --arn 'arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh'

Output::

    {
        "channel": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
            "authorized": false,
            "containerFormat": "TS",
            "ingestEndpoint": "a1b2c3d4e5f6.global-contribute.live-video.net",
            "insecureIngest": false,
            "latencyMode": "LOW",
            "multitrackInputConfiguration": {
                "enabled": false,
                "maximumResolution": "FULL_HD",
                "policy": "ALLOW"
            },
            "name": "channel-1",
            "playbackRestrictionPolicyArn": "",
            "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel.abcdEFGH.m3u8",
            "preset": "",
            "recordingConfigurationArn": "",
            "srt": {
                "endpoint": "a1b2c3d4e5f6.srt.live-video.net",
                "passphrase": "AB1C2defGHijkLMNo3PqQRstUvwxyzaBCDEfghh4ijklMN5opqrStuVWxyzAbCDEfghIJ"
            },
            "tags": {}
            "type": "STANDARD",
        }
    }

For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.