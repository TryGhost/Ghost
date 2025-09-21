**Example 1: To associate a configuration policy**

The following ``start-configuration-policy-association`` example associates the specified configuration policy with the specified organizational unit. A configuration may be associated with a target account, organizational unit, or the root. ::

    aws securityhub start-configuration-policy-association \
        --configuration-policy-identifier "arn:aws:securityhub:eu-central-1:123456789012:configuration-policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE33333" \
        --target '{"OrganizationalUnitId": "ou-6hi7-8j91kl2m"}'

Output::

    {
        "ConfigurationPolicyId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
        "TargetId": "ou-6hi7-8j91kl2m",
        "TargetType": "ORGANIZATIONAL_UNIT",
        "AssociationType": "APPLIED",
        "UpdatedAt": "2023-11-29T17:40:52.468000+00:00",
        "AssociationStatus": "PENDING"
    }

For more information, see `Creating and associating Security Hub configuration policies <https://docs.aws.amazon.com/securityhub/latest/userguide/create-associate-policy.html>`__ in the *AWS Security Hub User Guide*.

**Example 2: To associate a self-managed configuration**

The following ``start-configuration-policy-association`` example associates a self-managed configuration with the specified account. ::

    aws securityhub start-configuration-policy-association \
        --configuration-policy-identifier "SELF_MANAGED_SECURITY_HUB" \
        --target '{"OrganizationalUnitId": "123456789012"}'

Output::

    {
        "ConfigurationPolicyId": "SELF_MANAGED_SECURITY_HUB",
        "TargetId": "123456789012",
        "TargetType": "ACCOUNT",
        "AssociationType": "APPLIED",
        "UpdatedAt": "2023-11-29T17:40:52.468000+00:00",
        "AssociationStatus": "PENDING"
    }

For more information, see `Creating and associating Security Hub configuration policies <https://docs.aws.amazon.com/securityhub/latest/userguide/create-associate-policy.html>`__ in the *AWS Security Hub User Guide*.