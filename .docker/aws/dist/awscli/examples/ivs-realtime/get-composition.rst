**Example 1: To get a composition with default layout settings**

The following ``get-composition`` example gets the composition for the ARN (Amazon Resource Name) specified. ::

    aws ivs-realtime get-composition \
        --arn "arn:aws:ivs:ap-northeast-1:123456789012:composition/abcdABCDefgh"

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
                    "startTime": "2023-10-16T23:26:00+00:00",
                    "state": "ACTIVE"
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
                        }
                    },
                    "detail": {
                        "s3": {
                            "recordingPrefix": "aBcDeFgHhGfE/AbCdEfGhHgFe/GHFabcgefABC/composite"
                        }
                    },
                    "id": "GHFabcgefABC",
                    "startTime": "2023-10-16T23:26:00+00:00",
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
            "state": "ACTIVE",
            "tags": {}
        }
    }

For more information, see `IVS Composite Recording | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-composite-recording.html>`__ in the *Amazon IVS Real-Time Streaming User Guide*.

**Example 2: To get a composition with PiP layout**

The following ``get-composition`` example gets the composition for the ARN (Amazon Resource Name) specified, which uses PiP layout. ::

    aws ivs-realtime get-composition \
        --arn "arn:aws:ivs:ap-northeast-1:123456789012:composition/wxyzWXYZpqrs"

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
                    "startTime": "2023-10-16T23:26:00+00:00",
                    "state": "ACTIVE"
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
                    "startTime": "2023-10-16T23:26:00+00:00",
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
            "state": "ACTIVE",
            "tags": {}
        }
    }

For more information, see `IVS Composite Recording | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-composite-recording.html>`__ in the *Amazon IVS Real-Time Streaming User Guide*.

**Example 3: To get a composition with thumbnail recording enabled**

The following ``get-composition`` example gets the composition for the ARN (Amazon Resource Name) specified, which has thumbnail recording enabled with default settings. ::

    aws ivs-realtime get-composition \
        --arn "arn:aws:ivs:ap-northeast-1:123456789012:composition/abcdABCDefgh"

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
                    "startTime": "2023-10-16T23:26:00+00:00",
                    "state": "ACTIVE"
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
                                  ],
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
                    "startTime": "2023-10-16T23:26:00+00:00",
                    "state": "STARTING"
                }
            ],
            "layout": {
                "grid": {
                    "featuredParticipantAttribute": ""
                    "gridGap": 2,
                    "omitStoppedVideo": false,
                    "videoAspectRatio": "VIDEO",
                    "videoFillMode": ""                }
            },
            "stageArn": "arn:aws:ivs:ap-northeast-1:123456789012:stage/defgABCDabcd",
            "startTime": "2023-10-16T23:24:00+00:00",
            "state": "ACTIVE",
            "tags": {}
        }
    }

For more information, see `IVS Composite Recording | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-composite-recording.html>`__ in the *Amazon IVS Real-Time Streaming User Guide*.