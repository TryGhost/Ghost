**To get a stage's configuration information**

The following ``get-stage`` example gets the stage configuration for a specified stage ARN (Amazon Resource Name). ::

    aws ivs-realtime get-stage \
        --arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh

Output::

    {
        "stage": {
            "activeSessionId": "st-a1b2c3d4e5f6g",
            "arn": "arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh",
            "autoParticipantRecordingConfiguration": {
                "storageConfigurationArn": "",
                "mediaTypes": [
                    "AUDIO_VIDEO"
                ],
                "thumbnailConfiguration": {
                    "targetIntervalSeconds": 60,
                    "storage": [
                        "SEQUENTIAL"
                    ],
                    "recordingMode": "DISABLED"
                },
                "recordingReconnectWindowSeconds": 0,
                "hlsConfiguration": {
                    "targetSegmentDurationSeconds": 6
                },
                "recordParticipantReplicas": true
            },
            "endpoints": {
                "events": "wss://global.events.live-video.net",
                "rtmp": "rtmp://9x0y8z7s6t5u.global-contribute-staging.live-video.net/app/",
                "rtmps": "rtmps://9x0y8z7s6t5u.global-contribute-staging.live-video.net:443/app/",
                "whip": "https://9x0y8z7s6t5u.global-bm.whip.live-video.net"
            },
            "name": "test",
            "tags": {}
        }
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.