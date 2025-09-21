**To get channel configuration information about multiple channels**

The following ``batch-get-channel`` example lists information about the specified channels. ::

    aws ivs batch-get-channel \
        --arns arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh \
            arn:aws:ivs:us-west-2:123456789012:channel/efghEFGHijkl

Output::

    {
        "channels": [
            {
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
                "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel-1.abcdEFGH.m3u8",
                "preset": "",
                "playbackRestrictionPolicyArn": "",
                "recordingConfigurationArn": "arn:aws:ivs:us-west-2:123456789012:recording-configuration/ABCD12cdEFgh",
                "srt": {
                    "endpoint": "a1b2c3d4e5f6.srt.live-video.net",
                    "passphrase": "AB1C2defGHijkLMNo3PqQRstUvwxyzaBCDEfghh4ijklMN5opqrStuVWxyzAbCDEfghIJ"
                },
                "tags": {},
                "type": "STANDARD"
            },
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:channel/efghEFGHijkl",
                "authorized": false,
                "containerFormat": "FRAGMENTED_MP4",
                "ingestEndpoint": "a1b2c3d4e5f6.global-contribute.live-video.net",
                "insecureIngest": false,
                "latencyMode": "LOW",
                "multitrackInputConfiguration": {
                    "enabled": true,
                    "maximumResolution": "FULL_HD",
                    "policy": "ALLOW"
                },
                "name": "channel-2",
                "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel-2.abcdEFGH.m3u8",
                "preset": "",
                "playbackRestrictionPolicyArn": "arn:aws:ivs:us-west-2:123456789012:playback-restriction-policy/ABcdef34ghIJ"",
                "recordingConfigurationArn": "",
                "srt": {
                    "endpoint": "a1b2c3d4e5f6.srt.live-video.net",
                    "passphrase": "BA1C2defGHijkLMNo3PqQRstUvwxyzaBCDEfghh4ijklMN5opqrStuVWxyzAbCDEfghIJ"
                },
                "tags": {},
                "type": "STANDARD"
            }
        ]
    }

For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.
