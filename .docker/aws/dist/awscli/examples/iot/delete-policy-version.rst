**To delete a version of policy**

The following ``delete-policy-version`` example deletes version 2 of the specified policy from your AWS account. ::

    aws iot delete-policy-version \
        --policy-name UpdateDeviceCertPolicy \
        --policy-version-id 2

This command produces no output.

For more information, see `AWS IoT Policies <https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html>`__ in the *AWS IoT Developer Guide*.
