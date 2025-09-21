**To get details for a particular preset**

The following ``get-preset`` example requests the JSON definition of the specified custom preset. ::

    aws mediaconvert get-preset \
        --name SimpleMP4 \
        --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com

Output::

    {
        "Preset": {
            "Description": "Creates basic MP4 file. No filtering or preproccessing.",
            "Arn": "arn:aws:mediaconvert:us-west-2:123456789012:presets/SimpleMP4",
            "LastUpdated": 1568843141,
            "Name": "SimpleMP4",
            "Settings": {
                "ContainerSettings": {
                    "Mp4Settings": {
                        "FreeSpaceBox": "EXCLUDE",
                        "CslgAtom": "INCLUDE",
                        "MoovPlacement": "PROGRESSIVE_DOWNLOAD"
                    },
                    "Container": "MP4"
                },
                "AudioDescriptions": [
                    {
                        "LanguageCodeControl": "FOLLOW_INPUT",
                        "AudioTypeControl": "FOLLOW_INPUT",
                        "CodecSettings": {
                            "AacSettings": {
                                "RawFormat": "NONE",
                                "CodecProfile": "LC",
                                "AudioDescriptionBroadcasterMix": "NORMAL",
                                "SampleRate": 48000,
                                "Bitrate": 96000,
                                "RateControlMode": "CBR",
                                "Specification": "MPEG4",
                                "CodingMode": "CODING_MODE_2_0"
                            },
                            "Codec": "AAC"
                        }
                    }
                ],
                "VideoDescription": {
                    "RespondToAfd": "NONE",
                    "TimecodeInsertion": "DISABLED",
                    "Sharpness": 50,
                    "ColorMetadata": "INSERT",
                    "CodecSettings": {
                        "H264Settings": {
                            "FramerateControl": "INITIALIZE_FROM_SOURCE",
                            "SpatialAdaptiveQuantization": "ENABLED",
                            "Softness": 0,
                            "Telecine": "NONE",
                            "CodecLevel": "AUTO",
                            "QualityTuningLevel": "SINGLE_PASS",
                            "UnregisteredSeiTimecode": "DISABLED",
                            "Slices": 1,
                            "Syntax": "DEFAULT",
                            "GopClosedCadence": 1,
                            "AdaptiveQuantization": "HIGH",
                            "EntropyEncoding": "CABAC",
                            "InterlaceMode": "PROGRESSIVE",
                            "ParControl": "INITIALIZE_FROM_SOURCE",
                            "NumberBFramesBetweenReferenceFrames": 2,
                            "GopSizeUnits": "FRAMES",
                            "RepeatPps": "DISABLED",
                            "CodecProfile": "MAIN",
                            "FieldEncoding": "PAFF",
                            "GopSize": 90.0,
                            "SlowPal": "DISABLED",
                            "SceneChangeDetect": "ENABLED",
                            "GopBReference": "DISABLED",
                            "RateControlMode": "CBR",
                            "FramerateConversionAlgorithm": "DUPLICATE_DROP",
                            "FlickerAdaptiveQuantization": "DISABLED",
                            "DynamicSubGop": "STATIC",
                            "MinIInterval": 0,
                            "TemporalAdaptiveQuantization": "ENABLED",
                            "Bitrate": 400000,
                            "NumberReferenceFrames": 3
                        },
                        "Codec": "H_264"
                    },
                    "AfdSignaling": "NONE",
                    "AntiAlias": "ENABLED",
                    "ScalingBehavior": "DEFAULT",
                    "DropFrameTimecode": "ENABLED"
                }
            },
            "Type": "CUSTOM",
            "CreatedAt": 1568841521
        }
    }

For more information, see `Working with AWS Elemental MediaConvert Output Presets <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-presets.html>`__ in the *AWS Elemental MediaConvert User Guide*.
