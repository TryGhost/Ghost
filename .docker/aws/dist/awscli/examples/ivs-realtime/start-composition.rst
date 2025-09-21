**Example 1: To start a composition with default layout settings**

The following ``start-composition`` example starts a composition for the specified stage to be streamed to the specified locations. ::

    aws ivs-realtime start-composition \
        --stage-arn arn:aws:ivs:ap-northeast-1:123456789012:stage/defgABCDabcd \
        --destinations '[{"channel": {"channelArn": "arn:aws:ivs:ap-northeast-1:123456789012:channel/abcABCdefDEg", \
            "encoderConfigurationArn": "arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"}}, \
            {"s3":{"encoderConfigurationArns":["arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"], \ 
            "recordingConfiguration": {"hlsConfiguration": {"targetSegmentDurationSeconds": 5}}, \
            "storageConfigurationArn":"arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/FefABabCDcdE"}}]'

Output::

    {
        "composition": {
            "arn": "arn:aws:ivs:ap-northeast-1:123456789012:composition/abcdABCDefgh",
            "destinations": [
                {
                    "configuration": {
                        "channel": {
                            "channelArn": "arn:aws:ivs:ap-northeast-1:123456789012:channel/abcABCdefDEg",
                            "encoderConfigurationArn": "arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"
                        },
                        "name": ""
                    },
                    "id": "AabBCcdDEefF",
                    "state": "STARTING"
                },
                {
                    "configuration": {
                        "name": "",
                        "s3": {
                            "encoderConfigurationArns": [
                                "arn:aws:ivs:arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"
                            ],
                            "recordingConfiguration": {
                                "format": "HLS",
                                "hlsConfiguration": {
                                    "targetSegmentDurationSeconds": 5
                                }
                            },
                            "storageConfigurationArn": "arn:arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/FefABabCDcdE"
                        }
                    },
                    "detail": {
                        "s3": {
                            "recordingPrefix": "aBcDeFgHhGfE/AbCdEfGhHgFe/GHFabcgefABC/composite"
                        }
                    },
                    "id": "GHFabcgefABC",
                    "state": "STARTING"
                }
            ],
            "layout": {
                "grid": {
                    "featuredParticipantAttribute": ""
                    "gridGap": 2,
                    "omitStoppedVideo": false,
                    "videoAspectRatio": "VIDEO",
                    "videoFillMode": ""
                }
            },
            "stageArn": "arn:aws:ivs:ap-northeast-1:123456789012:stage/defgABCDabcd",
            "startTime": "2023-10-16T23:24:00+00:00",
            "state": "STARTING",
            "tags": {}
        }
    }

For more information, see `IVS Composite Recording | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-composite-recording.html>`__ in the *Amazon IVS Real-Time Streaming User Guide*.

**Example 2: To start a composition with PiP layout**

The following ``start-composition`` example starts a composition for the specified stage to be streamed to the specified locations using PiP layout. ::

    aws ivs-realtime start-composition \
        --stage-arn arn:aws:ivs:ap-northeast-1:123456789012:stage/defgABCDabcd \
        --destinations '[{"channel": {"channelArn": "arn:aws:ivs:ap-northeast-1:123456789012:channel/abcABCdefDEg", \
            "encoderConfigurationArn": "arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"}}, \
            {"s3":{"encoderConfigurationArns":["arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"], \
            "storageConfigurationArn":"arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/FefABabCDcdE"}}]' \
        --layout pip='{featuredParticipantAttribute="abcdefg"}'

Output::

    {
        "composition": {
            "arn": "arn:aws:ivs:ap-northeast-1:123456789012:composition/wxyzWXYZpqrs",
            "destinations": [
                {
                    "configuration": {
                        "channel": {
                            "channelArn": "arn:aws:ivs:ap-northeast-1:123456789012:channel/abcABCdefDEg",
                            "encoderConfigurationArn": "arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"
                        },
                        "name": ""
                    },
                    "id": "AabBCcdDEefF",
                    "state": "STARTING"
                },
                {
                    "configuration": {
                        "name": "",
                        "s3": {
                            "encoderConfigurationArns": [
                                "arn:aws:ivs:arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"
                            ],
                            "recordingConfiguration": {
                                "format": "HLS",
                                "hlsConfiguration": {
                                    "targetSegmentDurationSeconds": 2
                                }
                            },
                            "storageConfigurationArn": "arn:arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/FefABabCDcdE"
                        }
                    },
                    "detail": {
                        "s3": {
                            "recordingPrefix": "aBcDeFgHhGfE/AbCdEfGhHgFe/GHFabcgefABC/composite"
                        }
                    },
                    "id": "GHFabcgefABC",
                    "state": "STARTING"
                }
            ],
            "layout": {
                "pip": {
                    "featuredParticipantAttribute": "abcdefg",
                    "gridGap": 0,
                    "omitStoppedVideo": false,
                    "pipBehavior": "STATIC",
                    "pipOffset": 0,
                    "pipParticipantAttribute": "",
                    "pipPosition": "BOTTOM_RIGHT",
                    "videoFillMode": "COVER"
                }
            },
            "stageArn": "arn:aws:ivs:ap-northeast-1:123456789012:stage/defgABCDabcd",
            "startTime": "2023-10-16T23:24:00+00:00",
            "state": "STARTING",
            "tags": {}
        }
    }

For more information, see `IVS Composite Recording | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-composite-recording.html>`__ in the *Amazon IVS Real-Time Streaming User Guide*.

**Example 3: To start a composition with thumbnail recording enabled**

The following ``start-composition`` example starts a composition for the specified stage to be streamed to the specified locations with thumbnail recording enabled. ::

    aws ivs-realtime start-composition \
        --stage-arn arn:aws:ivs:ap-northeast-1:123456789012:stage/defgABCDabcd \
        --destinations '[{"channel": {"channelArn": "arn:aws:ivs:ap-northeast-1:123456789012:channel/abcABCdefDEg", \
            "encoderConfigurationArn": "arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"}}, \
            {"s3": {"encoderConfigurationArns": ["arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"], \ 
            "storageConfigurationArn": "arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/FefABabCDcdE", \
            "thumbnailConfigurations": [{"storage": ["SEQUENTIAL"],"targetIntervalSeconds": 60}]}}]'

Output::

    {
        "composition": {
            "arn": "arn:aws:ivs:ap-northeast-1:123456789012:composition/abcdABCDefgh",
            "destinations": [
                {
                    "configuration": {
                        "channel": {
                            "channelArn": "arn:aws:ivs:ap-northeast-1:123456789012:channel/abcABCdefDEg",
                            "encoderConfigurationArn": "arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"
                        },
                        "name": ""
                    },
                    "id": "AabBCcdDEefF",
                    "state": "STARTING"
                },
                {
                    "configuration": {
                        "name": "",
                        "s3": {
                            "encoderConfigurationArns": [
                                "arn:aws:ivs:arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef"
                            ],
                            "recordingConfiguration": {
                                "format": "HLS",
                                "hlsConfiguration": {
                                    "targetSegmentDurationSeconds": 2
                                }
                            },
                            "storageConfigurationArn": "arn:arn:aws:ivs:ap-northeast-1:123456789012:storage-configuration/FefABabCDcdE",
                            "thumbnailConfigurations": [
                               {
                                  "targetIntervalSeconds": 60,
                                  "storage": [
                                      "SEQUENTIAL"
                                  ]
                               }
                            ]
                        }
                    },
                    "detail": {
                        "s3": {
                            "recordingPrefix": "aBcDeFgHhGfE/AbCdEfGhHgFe/GHFabcgefABC/composite"
                        }
                    },
                    "id": "GHFabcgefABC",
                    "state": "STARTING"
                }
            ],
            "layout": {
                "grid": {
                    "featuredParticipantAttribute": ""
                    "gridGap": 2,
                    "omitStoppedVideo": false,
                    "videoAspectRatio": "VIDEO",
                    "videoFillMode": ""
                }
            },
            "stageArn": "arn:aws:ivs:ap-northeast-1:123456789012:stage/defgABCDabcd",
            "startTime": "2023-10-16T23:24:00+00:00",
            "state": "STARTING",
            "tags": {}
        }
    }

For more information, see `IVS Composite Recording | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-composite-recording.html>`__ in the *Amazon IVS Real-Time Streaming User Guide*.