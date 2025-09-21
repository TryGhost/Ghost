**To associate a security profile with all unregistered devices**

The following ``attach-security-profile`` example associates the AWS IoT Device Defender security profile named ``Testprofile`` with all unregistered devices in the ``us-west-2`` region for this AWS account. ::

    aws iot attach-security-profile \
        --security-profile-name Testprofile \
        --security-profile-target-arn "arn:aws:iot:us-west-2:123456789012:all/unregistered-things"

This command produces no output.

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
