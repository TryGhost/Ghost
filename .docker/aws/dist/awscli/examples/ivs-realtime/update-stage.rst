**Example 1: To update a stage's configuration**

The following ``update-stage`` example updates a stage for a specified stage ARN to update the stage name and configure individual participant recording with thumbnail recording enabled. ::

    aws ivs-realtime update-stage \
        --arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --auto-participant-recording-configuration '{"mediaTypes": ["AUDIO_VIDEO"],"storageConfigurationArn": "arn:aws:ivs:us-west-2:123456789012:storage-configuration/abcdABCDefgh", "recordingReconnectWindowSeconds": 100, \
            "thumbnailConfiguration": {"recordingMode": "INTERVAL","storage": ["SEQUENTIAL"],"targetIntervalSeconds": 60}} \
            "hlsConfiguration": {"targetSegmentDurationSeconds": 5}}' \
        --name stage1a

Output::

    {
        "stage": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh",
            "autoParticipantRecordingConfiguration": {
                "mediaTypes": [
                    "AUDIO_VIDEO"
                ],
                "storageConfigurationArn": "arn:aws:ivs:us-west-2:123456789012:storage-configuration/abcdABCDefgh",
                "thumbnailConfiguration": {
                    "targetIntervalSeconds": 60,
                    "storage": [
                        "SEQUENTIAL"
                    ],
                    "recordingMode": "INTERVAL"
                },
                "recordingReconnectWindowSeconds": 100,
                "hlsConfiguration": {
                    "targetSegmentDurationSeconds": 5
                },
                "recordParticipantReplicas": true
            },
            "endpoints": {
                "events": "wss://global.events.live-video.net",
                "rtmp": "rtmp://9x0y8z7s6t5u.global-contribute-staging.live-video.net/app/",
                "rtmps": "rtmps://9x0y8z7s6t5u.global-contribute-staging.live-video.net:443/app/",
                "whip": "https://1a2b3c4d5e6f.global-bm.whip.live-video.net"
            },
            "name": "stage1a",
            "tags": {}
        }
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.

**Example 2: To update a stage's configuration, including disabling participant replica recording**

The following ``update-stage`` example updates a stage for a specified stage ARN to update the stage name and configure individual participant recording with thumbnail recording enabled and participant replica recording disabled. ::

    aws ivs-realtime update-stage \
        --arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --auto-participant-recording-configuration '{"mediaTypes": ["AUDIO_VIDEO"],"storageConfigurationArn": "arn:aws:ivs:us-west-2:123456789012:storage-configuration/abcdABCDefgh", "recordingReconnectWindowSeconds": 100, \
            "thumbnailConfiguration": {"recordingMode": "INTERVAL","storage": ["SEQUENTIAL"],"targetIntervalSeconds": 60}, "recordParticipantReplicas":false} \
            "hlsConfiguration": {"targetSegmentDurationSeconds": 5}}' \
        --name stage1a

Output::

    {
        "stage": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh",
            "autoParticipantRecordingConfiguration": {
                "mediaTypes": [
                    "AUDIO_VIDEO"
                ],
                "storageConfigurationArn": "arn:aws:ivs:us-west-2:123456789012:storage-configuration/abcdABCDefgh",
                "thumbnailConfiguration": {
                    "targetIntervalSeconds": 60,
                    "storage": [
                        "SEQUENTIAL"
                    ],
                    "recordingMode": "INTERVAL"
                },
                "recordingReconnectWindowSeconds": 100,
                "hlsConfiguration": {
                    "targetSegmentDurationSeconds": 5
                },
                "recordParticipantReplicas": false
            },
            "endpoints": {
                "events": "wss://global.events.live-video.net",
                "rtmp": "rtmp://9x0y8z7s6t5u.global-contribute-staging.live-video.net/app/",
                "rtmps": "rtmps://9x0y8z7s6t5u.global-contribute-staging.live-video.net:443/app/",
                "whip": "https://1a2b3c4d5e6f.global-bm.whip.live-video.net"
            },
            "name": "stage1a",
            "tags": {}
        }
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon IVS Low-Latency Streaming User Guide*.