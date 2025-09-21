**To disassociate a security profile from a target**

The following ``detach-security-profile`` example removes the association between the AWS IoT Device Defender security profile named ``Testprofile`` and the all registered things target. ::

    aws iot detach-security-profile \
        --security-profile-name Testprofile \
        --security-profile-target-arn "arn:aws:iot:us-west-2:123456789012:all/registered-things"

This command produces no output.

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
