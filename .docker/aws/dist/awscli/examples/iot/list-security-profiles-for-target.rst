**To list the security profiles attached to a target**

The following ``list-security-profiles-for-target`` example lists the AWS IoT Device Defender security profiles that are attached to unregistered devices. ::

    aws iot list-security-profiles-for-target  \
        --security-profile-target-arn "arn:aws:iot:us-west-2:123456789012:all/unregistered-things"

Output::

    {
        "securityProfileTargetMappings": [
            {
                "securityProfileIdentifier": {
                    "name": "Testprofile",
                    "arn": "arn:aws:iot:us-west-2:123456789012:securityprofile/Testprofile"
                },
                "target": {
                    "arn": "arn:aws:iot:us-west-2:123456789012:all/unregistered-things"
                }
            }
        ]
    }

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
