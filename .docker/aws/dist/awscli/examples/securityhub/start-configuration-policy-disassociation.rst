**Example 1: To disassociate a configuration policy**

The following ``start-configuration-policy-disassociation`` example disassociates a configuration policy from the specified organizational unit. A configuration may be disassociated from a target account, organizational unit, or the root. ::

    aws securityhub start-configuration-policy-disassociation \
        --configuration-policy-identifier "arn:aws:securityhub:eu-central-1:123456789012:configuration-policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE33333" \
        --target '{"OrganizationalUnitId": "ou-6hi7-8j91kl2m"}'

This command produces no output.

For more information, see `Disassociating a configuration from accounts and OUs <https://docs.aws.amazon.com/securityhub/latest/userguide/delete-disassociate-policy.html#disassociate-policy>`__ in the *AWS Security Hub User Guide*.

**Example 2: To disassociate a self-managed configuration**

The following ``start-configuration-policy-disassociation`` example disassociates a self-managed configuration from the specified account. ::

    aws securityhub start-configuration-policy-disassociation \
        --configuration-policy-identifier "SELF_MANAGED_SECURITY_HUB" \
        --target '{"AccountId": "123456789012"}'

This command produces no output.

For more information, see `Disassociating a configuration from accounts and OUs <https://docs.aws.amazon.com/securityhub/latest/userguide/delete-disassociate-policy.html#disassociate-policy>`__ in the *AWS Security Hub User Guide*.