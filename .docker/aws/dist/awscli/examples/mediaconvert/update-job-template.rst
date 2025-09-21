**To change a job template**

The following ``update-job-template`` example replaces the JSON definition of the specified custom job template with the JSON definition in the provided file.

    aws mediaconvert update-job-template \
        --name File1 \
        --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com \
        --cli-input-json file://~/job-template-update.json

Contents of ``job-template-update.json``:: 

    {
        "Description": "A simple job template that generates a single file output.",
        "Queue": "arn:aws:mediaconvert:us-east-1:012345678998:queues/Default",
        "Name": "SimpleFile",
        "Settings": {
          "OutputGroups": [
            {
              "Name": "File Group",
              "Outputs": [
                {
                  "ContainerSettings": {
                    "Container": "MP4",
                    "Mp4Settings": {
                      "CslgAtom": "INCLUDE",
                      "FreeSpaceBox": "EXCLUDE",
                      "MoovPlacement": "PROGRESSIVE_DOWNLOAD"
                    }
                  },
                  "VideoDescription": {
                    "ScalingBehavior": "DEFAULT",
                    "TimecodeInsertion": "DISABLED",
                    "AntiAlias": "ENABLED",
                    "Sharpness": 50,
                    "CodecSettings": {
                      "Codec": "H_264",
                      "H264Settings": {
                        "InterlaceMode": "PROGRESSIVE",
                        "NumberReferenceFrames": 3,
                        "Syntax": "DEFAULT",
                        "Softness": 0,
                        "GopClosedCadence": 1,
                        "GopSize": 90,
                        "Slices": 1,
                        "GopBReference": "DISABLED",
                        "SlowPal": "DISABLED",
                        "SpatialAdaptiveQuantization": "ENABLED",
                        "TemporalAdaptiveQuantization": "ENABLED",
                        "FlickerAdaptiveQuantization": "DISABLED",
                        "EntropyEncoding": "CABAC",
                        "Bitrate": 400000,
                        "FramerateControl": "INITIALIZE_FROM_SOURCE",
                        "RateControlMode": "CBR",
                        "CodecProfile": "MAIN",
                        "Telecine": "NONE",
                        "MinIInterval": 0,
                        "AdaptiveQuantization": "HIGH",
                        "CodecLevel": "AUTO",
                        "FieldEncoding": "PAFF",
                        "SceneChangeDetect": "ENABLED",
                        "QualityTuningLevel": "SINGLE_PASS",
                        "FramerateConversionAlgorithm": "DUPLICATE_DROP",
                        "UnregisteredSeiTimecode": "DISABLED",
                        "GopSizeUnits": "FRAMES",
                        "ParControl": "INITIALIZE_FROM_SOURCE",
                        "NumberBFramesBetweenReferenceFrames": 2,
                        "RepeatPps": "DISABLED",
                        "DynamicSubGop": "STATIC"
                      }
                    },
                    "AfdSignaling": "NONE",
                    "DropFrameTimecode": "ENABLED",
                    "RespondToAfd": "NONE",
                    "ColorMetadata": "INSERT"
                  },
                  "AudioDescriptions": [
                    {
                      "AudioTypeControl": "FOLLOW_INPUT",
                      "CodecSettings": {
                        "Codec": "AAC",
                        "AacSettings": {
                          "AudioDescriptionBroadcasterMix": "NORMAL",
                          "Bitrate": 96000,
                          "RateControlMode": "CBR",
                          "CodecProfile": "LC",
                          "CodingMode": "CODING_MODE_2_0",
                          "RawFormat": "NONE",
                          "SampleRate": 48000,
                          "Specification": "MPEG4"
                        }
                      },
                      "LanguageCodeControl": "FOLLOW_INPUT"
                    }
                  ]
                }
              ],
              "OutputGroupSettings": {
                "Type": "FILE_GROUP_SETTINGS",
                "FileGroupSettings": {}
              }
            }
          ],
          "AdAvailOffset": 0
        },
        "StatusUpdateInterval": "SECONDS_60",
        "Priority": 0
    }

The system returns the JSON payload that you send with your request, even when the request results in an error. Therefore, the JSON returned is not necessarily the new definition of the job template.

Because the JSON payload can be long, you might need to scroll up to see any error messages.

For more information, see `Working with AWS Elemental MediaConvert Job Templates <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-job-templates.html>`__ in the *AWS Elemental MediaConvert User Guide*.
