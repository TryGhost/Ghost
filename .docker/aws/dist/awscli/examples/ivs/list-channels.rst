**Example 1: To get summary information about all channels**

The following ``list-channels`` example lists all channels for your AWS account. ::

    aws ivs list-channels

Output::

    {
        "channels": [
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
                "name": "channel-1",
                "latencyMode": "LOW",
                "authorized": false,
                "insecureIngest": false,
                "preset": "",
                "playbackRestrictionPolicyArn": "",
                "recordingConfigurationArn": "arn:aws:ivs:us-west-2:123456789012:recording-configuration/ABCD12cdEFgh",
                "tags": {},
                "type": "STANDARD"
            },
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:channel/efghEFGHijkl",
                "name": "channel-2",
                "latencyMode": "LOW",
                "authorized": false,
                "preset": "",
                "playbackRestrictionPolicyArn": "arn:aws:ivs:us-west-2:123456789012:playback-restriction-policy/ABcdef34ghIJ",
                "recordingConfigurationArn": "",
                "tags": {},
                "type": "STANDARD"
            }
        ]
    }

For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.

**Example 2: To get summary information about all channels, filtered by the specified RecordingConfiguration ARN**

The following ``list-channels`` example lists all channels for your AWS account, that are associated with the specified RecordingConfiguration ARN. ::

    aws ivs list-channels \
        --filter-by-recording-configuration-arn "arn:aws:ivs:us-west-2:123456789012:recording-configuration/ABCD12cdEFgh"

Output::

    {
        "channels": [
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh",
                "name": "channel-1",
                "latencyMode": "LOW",
                "authorized": false,
                "insecureIngest": false,
                "preset": "",
                "playbackRestrictionPolicyArn": "",
                "recordingConfigurationArn": "arn:aws:ivs:us-west-2:123456789012:recording-configuration/ABCD12cdEFgh",
                "tags": {},
                "type": "STANDARD"
            }
        ]
    }

For more information, see `Record to Amazon S3 <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/record-to-s3.html>`__ in the *IVS Low-Latency User Guide*.

**Example 3: To get summary information about all channels, filtered by the specified PlaybackRestrictionPolicy ARN**

The following ``list-channels`` example lists all channels for your AWS account, that are associated with the specified PlaybackRestrictionPolicy ARN. ::

    aws ivs list-channels \
        --filter-by-playback-restriction-policy-arn "arn:aws:ivs:us-west-2:123456789012:playback-restriction-policy/ABcdef34ghIJ"

Output::

    {
        "channels": [
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:channel/efghEFGHijkl",
                "name": "channel-2",
                "latencyMode": "LOW",
                "authorized": false,
                "preset": "",
                "playbackRestrictionPolicyArn": "arn:aws:ivs:us-west-2:123456789012:playback-restriction-policy/ABcdef34ghIJ",
                "recordingConfigurationArn": "",
                "tags": {},
                "type": "STANDARD"
            }
        ]
    }

For more information, see `Undesired Content and Viewers <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/undesired-content.html>`__ in the *IVS Low-Latency User Guide*.