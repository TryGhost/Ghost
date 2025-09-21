**Example 1: To update a channel's configuration information**

The following ``update-channel`` example updates the channel configuration for a specified channel ARN to change the channel name. This does not affect an ongoing stream of this channel; you must stop and restart the stream for the changes to take effect. ::

    aws ivs update-channel \
        --arn 'arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh' \
        --name 'channel-1' \
        --insecure-ingest

Output::

    {
        "channel": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
            "name": "channel-1",
            "latencyMode": "LOW",
            "containerFormat": "TS",
            "multitrackInputConfiguration": { 
                "enabled": false,
                "maximumResolution": "FULL_HD",
                "policy": "ALLOW"
            },
            "type": "STANDARD",
            "playbackRestrictionPolicyArn": "",
            "recordingConfigurationArn": "",
            "srt": {
                "endpoint": "a1b2c3d4e5f6.srt.live-video.net",
                "passphrase": "AB1C2defGHijkLMNo3PqQRstUvwxyzaBCDEfghh4ijklMN5opqrStuVWxyzAbCDEfghIJ"
            },
            "ingestEndpoint": "a1b2c3d4e5f6.global-contribute.live-video.net",
            "insecureIngest": true,
            "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel.abcdEFGH.m3u8",
            "preset": "",
            "authorized": false,
            "tags": {}
    }

For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.

**Example 2: To update a channel's configuration to enable recording**

The following ``update-channel`` example updates the channel configuration for a specified channel ARN to enable recording. This does not affect an ongoing stream of this channel; you must stop and restart the stream for the changes to take effect. ::

    aws ivs update-channel \
        --arn 'arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh' \
        --no-insecure-ingest \
        --recording-configuration-arn 'arn:aws:ivs:us-west-2:123456789012:recording-configuration/ABCD12cdEFgh'

Output::

    {
        "channel": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
            "name": "test-channel-with-recording",
            "latencyMode": "LOW",
            "containerFormat": "TS",
            "multitrackInputConfiguration": { 
                "enabled": false,
                "maximumResolution": "FULL_HD",
                "policy": "ALLOW"
            },
            "type": "STANDARD",
            "playbackRestrictionPolicyArn": "",
            "recordingConfigurationArn": "arn:aws:ivs:us-west-2:123456789012:recording-configuration/ABCD12cdEFgh",
            "srt": {
                "endpoint": "a1b2c3d4e5f6.srt.live-video.net",
                "passphrase": "BA1C2defGHijkLMNo3PqQRstUvwxyzaBCDEfghh4ijklMN5opqrStuVWxyzAbCDEfghIJ"
            },
            "ingestEndpoint": "a1b2c3d4e5f6.global-contribute.live-video.net",
            "insecureIngest": false,
            "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel.abcdEFGH.m3u8",
            "preset": "",
            "authorized": false,
            "tags": {}
        }
    }

For more information, see `Record to Amazon S3 <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/record-to-s3.html>`__ in the *IVS Low-Latency User Guide*.

**Example 3: To update a channel's configuration to disable recording**

The following ``update-channel`` example updates the channel configuration for a specified channel ARN to disable recording. This does not affect an ongoing stream of this channel; you must stop and restart the stream for the changes to take effect. ::

    aws ivs update-channel \
        --arn 'arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh' \
        --recording-configuration-arn ''

Output::

    {
        "channel": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
            "name": "test-channel-with-recording",
            "latencyMode": "LOW",
            "containerFormat": "TS",
            "multitrackInputConfiguration": { 
                "enabled": false,
                "maximumResolution": "FULL_HD",
                "policy": "ALLOW"
            },
            "type": "STANDARD",
            "playbackRestrictionPolicyArn": "",
            "recordingConfigurationArn": "",
            "srt": {
                "endpoint": "a1b2c3d4e5f6.srt.live-video.net",
                "passphrase": "AB1C2edfGHijkLMNo3PqQRstUvwxyzaBCDEfghh4ijklMN5opqrStuVWxyzAbCDEfghIJ"
            },
            "ingestEndpoint": "a1b2c3d4e5f6.global-contribute.live-video.net",
            "insecureIngest": false,
            "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel.abcdEFGH.m3u8",
            "preset": "",
            "authorized": false,
            "tags": {}
        }
    }

For more information, see `Record to Amazon S3 <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/record-to-s3.html>`__ in the *IVS Low-Latency User Guide*.

**Example 4: To update a channel's configuration to enable playback restriction**

The following ``update-channel`` example updates the channel configuration for a specified channel ARN to apply a playback restriction policy. This does not affect an ongoing stream of this channel; you must stop and restart the stream for the changes to take effect. ::

    aws ivs update-channel \
        --arn 'arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh' \
        --no-insecure-ingest \
        --playback-restriction-policy-arn 'arn:aws:ivs:us-west-2:123456789012:playback-restriction-policy/ABcdef34ghIJ'

Output::

    {
        "channel": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
            "name": "test-channel-with-playback-restriction-policy",
            "latencyMode": "LOW",
            "containerFormat": "TS",
            "multitrackInputConfiguration": { 
                "enabled": false,
                "maximumResolution": "FULL_HD",
                "policy": "ALLOW"
            },
            "type": "STANDARD",
            "playbackRestrictionPolicyArn": "arn:aws:ivs:us-west-2:123456789012:playback-restriction-policy/ABcdef34ghIJ",
            "recordingConfigurationArn": "",
            "srt": {
                "endpoint": "a1b2c3d4e5f6.srt.live-video.net",
                "passphrase": "AB1C2defGHijkLMNo3PqQRstUvwxyzaCBDEfghh4ijklMN5opqrStuVWxyzAbCDEfghIJ"
            },
            "ingestEndpoint": "a1b2c3d4e5f6.global-contribute.live-video.net",
            "insecureIngest": false,
            "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel.abcdEFGH.m3u8",
            "preset": "",
            "authorized": false,
            "tags": {}
        }
    }

For more information, see `Undesired Content and Viewers <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/undesired-content.html>`__ in the *IVS Low-Latency User Guide*.

**Example 5: To update a channel's configuration to disable playback restriction**

The following ``update-channel`` example updates the channel configuration for a specified channel ARN to disable playback restriction. This does not affect an ongoing stream of this channel; you must stop and restart the stream for the changes to take effect. ::

    aws ivs update-channel \
        --arn 'arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh' \
        --playback-restriction-policy-arn ''

Output::

    {
        "channel": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
            "name": "test-channel-with-playback-restriction-policy",
            "latencyMode": "LOW",
            "containerFormat": "TS",
            "multitrackInputConfiguration": { 
                "enabled": false,
                "maximumResolution": "FULL_HD",
                "policy": "ALLOW"
            },
            "type": "STANDARD",
            "playbackRestrictionPolicyArn": "",
            "recordingConfigurationArn": "",
            "srt": {
                "endpoint": "a1b2c3d4e5f6.srt.live-video.net",
                "passphrase": "AB1C2defGHijkLMNo3PqQRstUvwxyzaBCDeFghh4ijklMN5opqrStuVWxyzAbCDEfghIJ"
            },
            "ingestEndpoint": "a1b2c3d4e5f6.global-contribute.live-video.net",
            "insecureIngest": false,
            "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel.abcdEFGH.m3u8",
            "preset": "",
            "authorized": false,
            "tags": {}
        }
    }

For more information, see `Undesired Content and Viewers <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/undesired-content.html>`__ in the *IVS Low-Latency User Guide*.

**Example 6: To update a channel's configuration to enable multitrack**

The following ``update-channel`` example updates the channel configuration for a specified channel ARN to enable multitrack. This does not affect an ongoing stream of this channel; you must stop and restart the stream for the changes to take effect. ::

    aws ivs update-channel \
        --arn 'arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh' \
        --container-format 'FRAGMENTED_MP4' \
        --multitrack-input-configuration '{"enabled": true,"maximumResolution": "FULL_HD","policy": "ALLOW"}'

Output::

    {
        "channel": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
            "containerFormat": "FRAGMENTED_MP4",
            "name": "test-channel-with-multitrack",
            "latencyMode": "LOW",
            "multitrackInputConfiguration": { 
                "enabled": true,
                "maximumResolution": "FULL_HD",
                "policy": "ALLOW"
            },
            "type": "STANDARD",
            "playbackRestrictionPolicyArn": "",
            "recordingConfigurationArn": "",
            "srt": {
                "endpoint": "a1b2c3d4e5f6.srt.live-video.net",
                "passphrase": "AB1C2defGHijkLMNo3PqQRstUvwxyzaCBDEfghh4ijklMN5opqrStuVWxyzAbCDEfghIJ"
            },
            "ingestEndpoint": "a1b2c3d4e5f6.global-contribute.live-video.net",
            "insecureIngest": false,
            "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel.abcdEFGH.m3u8",
            "preset": "",
            "authorized": false,
            "tags": {}
        }
    }

For more information, see `Undesired Content and Viewers <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multitrack-video.html>`__ in the *IVS Low-Latency User Guide*.

**Example 7: To update a channel's configuration to disable playback restriction**

The following ``update-channel`` example updates the channel configuration for a specified channel ARN to disable multitrack. This does not affect an ongoing stream of this channel; you must stop and restart the stream for the changes to take effect. ::

    aws ivs update-channel \
        --arn 'arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh' \
        --container-format 'TS' \
        --multitrack-input-configuration '{"enabled": false}'

Output::

    {
        "channel": {
            ""arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
            "containerFormat": "TS",
            "name": "test-channel-with-multitrack",
            "latencyMode": "LOW",
            "multitrackInputConfiguration": { 
                "enabled": false,
                "maximumResolution": "FULL_HD",
                "policy": "ALLOW"
            },
            "type": "STANDARD",
            "playbackRestrictionPolicyArn": "",
            "recordingConfigurationArn": "",
            "srt": {
                "endpoint": "a1b2c3d4e5f6.srt.live-video.net",
                "passphrase": "AB1C2defGHijkLMNo3PqQRstUvwxyzaCBDEfghh4ijklMN5opqrStuVWxyzAbCDEfghIJ"
            },
            "ingestEndpoint": "a1b2c3d4e5f6.global-contribute.live-video.net",
            "insecureIngest": false,
            "playbackUrl": "https://a1b2c3d4e5f6.us-west-2.playback.live-video.net/api/video/v1/us-west-2.123456789012.channel.abcdEFGH.m3u8",
            "preset": "",
            "authorized": false,
            "tags": {}
        }
    }

For more information, see `Undesired Content and Viewers <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multitrack-video.html>`__ in the *IVS Low-Latency User Guide*.