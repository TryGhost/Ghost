**To get metadata for a specified stream**

The following ``get-stream-session`` example gets the metadata configuration for the specified channel ARN (Amazon Resource Name) and the specified stream; if ``streamId`` is not provided, the most recent stream for the channel is selected. ::

    aws ivs get-stream-session \
        --channel-arn 'arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh' \
        --stream-id 'mystream'

Output::

    {
        "streamSession": {
            "streamId": "mystream1",
            "startTime": "2023-06-26T19:09:28+00:00",
            "channel": {
                "arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
                "name": "mychannel",
                "latencyMode": "LOW",
                "type": "STANDARD",
                "recordingConfigurationArn": "arn:aws:ivs:us-west-2:123456789012:recording-configuration/ABcdef34ghIJ",
                "ingestEndpoint": "a1b2c3d4e5f6.global-contribute.live-video.net",
                "playbackUrl": "url-string",
                "authorized": false,
                "insecureIngest": false,
                "preset": ""
            },
            "ingestConfiguration": {
                "audio": {
                    "channels": 2,
                    "codec": "mp4a.40.2",
                    "sampleRate": 8000,
                    "targetBitrate": 46875,
                    "track": "Track0"
                },
                "video": {
                    "avcProfile": "Baseline",
                    "avcLevel": "4.2",
                    "codec": "avc1.42C02A",
                    "encoder": "Lavf58.45.100",
                    "level": "4.2",
                    "profile": "Baseline",
                    "targetBitrate": 8789062,
                    "targetFramerate": 60,
                    "track": "Track0",
                    "videoHeight": 1080,
                    "videoWidth": 1920
                }
            },
            "ingestConfigurations": {
                "audioConfigurations": [
                    {
                        "channels": 2,
                        "codec": "mp4a.40.2",
                        "sampleRate": 8000,
                        "targetBitrate": 46875,
                        "track": "Track0"
                    }
                ],
                "videoConfigurations": [
                    {
                        "codec": "avc1.42C02A",
                        "encoder": "Lavf58.45.100",
                        "level": "4.2",
                        "profile": "Baseline",
                        "targetBitrate": 8789062,
                        "targetFramerate": 60,
                        "track": "Track0",
                        "videoHeight": 1080,
                        "videoWidth": 1920
                    }
                ]
            },
            "recordingConfiguration": {
                "arn": "arn:aws:ivs:us-west-2:123456789012:recording-configuration/ABcdef34ghIJ",
                "name": "test-recording-config",
                "destinationConfiguration": {
                    "s3": {
                        "bucketName": "demo-recording-bucket"
                    }
                },
                "state": "ACTIVE",
                "tags": {
                    "key1": "value1",
                    "key2": "value2"
                },
                "thumbnailConfiguration": {
                    "recordingMode": "INTERVAL",
                    "targetIntervalSeconds": 1,
                    "resolution": "LOWEST_RESOLUTION",
                    "storage": [
                        "LATEST"
                    ]
                },
                "recordingReconnectWindowSeconds": 60,
                "renditionConfiguration": {
                    "renditionSelection": "CUSTOM",
                    "renditions": [
                        "HD"
                    ]
                }
            },
            "truncatedEvents": [
                {
                    "code": "StreamTakeoverInvalidPriority",
                    "name": "Stream Takeover Failure",
                    "type": "IVS Stream State Change",
                    "eventTime": "2023-06-26T19:09:48+00:00"
                },
                {
                    "name": "Stream Takeover",
                    "type": "IVS Stream State Change",
                    "eventTime": "2023-06-26T19:09:47+00:00"
                },
                {
                    "name": "Recording Start",
                    "type": "IVS Recording State Change",
                    "eventTime": "2023-06-26T19:09:35+00:00"
                },
                {
                    "name": "Stream Start",
                    "type": "IVS Stream State Change",
                    "eventTime": "2023-06-26T19:09:34+00:00"
                },  
                {
                    "name": "Session Created",
                    "type": "IVS Stream State Change",
                    "eventTime": "2023-06-26T19:09:28+00:00"
                }
            ]
        }
    }

For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.
