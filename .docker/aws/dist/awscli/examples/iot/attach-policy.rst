**Example 1: To attach a policy to a thing group**

The following ``attach-policy`` example attaches the specified policy to a thing group identified by its ARN. ::

    aws iot attach-policy \
        --target "arn:aws:iot:us-west-2:123456789012:thinggroup/LightBulbs" \
        --policy-name "UpdateDeviceCertPolicy"

This command does not produce any output.

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.

**Example 2: To attach a policy to a certificate**

The following ``attach-policy`` example attaches the policy ``UpdateDeviceCertPolicy`` to the principal specified by a certificate. ::

    aws iot attach-policy \
        --policy-name UpdateDeviceCertPolicy \
        --target "arn:aws:iot:us-west-2:123456789012:cert/4f0ba725787aa94d67d2fca420eca022242532e8b3c58e7465c7778b443fd65e"

This command does not produce any output.

For more information, see `Attach an AWS IoT Policy to a Device Certificate <https://docs.aws.amazon.com/iot/latest/developerguide/attach-policy-to-certificate.html>`__ in the *AWS IoT Developers Guide*.
