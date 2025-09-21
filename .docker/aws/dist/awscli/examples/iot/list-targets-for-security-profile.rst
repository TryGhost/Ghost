**To list the targets to which a security profile is applied**

The following ``list-targets-for-security-profile`` example lists the targets to which the AWS IoT Device Defender security profile named ``PossibleIssue`` is applied. ::

    aws iot list-targets-for-security-profile \
        --security-profile-name Testprofile

Output::

    {
        "securityProfileTargets": [
            {
                "arn": "arn:aws:iot:us-west-2:123456789012:all/unregistered-things"
            },
            {
                "arn": "arn:aws:iot:us-west-2:123456789012:all/registered-things"
            }
        ]
    }

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
