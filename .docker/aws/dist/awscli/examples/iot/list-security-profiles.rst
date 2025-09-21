**To list the security profiles for your AWS account**

The following ``list-security-profiles`` example lists all AWS IoT Device Defender security profiles that are defined in your AWS account. ::

    aws iot list-security-profiles

Output::

    {
        "securityProfileIdentifiers": [
            {
                "name": "Testprofile",
                "arn": "arn:aws:iot:us-west-2:123456789012:securityprofile/Testprofile"
            }
        ]
    }

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
