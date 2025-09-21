**To delete a configuration policy**

The following ``delete-configuration-policy`` example deletes the specified configuration policy. ::

    aws securityhub delete-configuration-policy \
        --identifier "arn:aws:securityhub:eu-central-1:123456789012:configuration-policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"

This command produces no output.

For more information, see `Deleting and disassociating Security Hub configuration policies <https://docs.aws.amazon.com/securityhub/latest/userguide/delete-disassociate-policy.html>`__ in the *AWS Security Hub User Guide*.