**To list configuration associations**

The following ``list-configuration-policy-associations`` example lists a summary of configuration associations for the organization. The response include associations with configuration policies and self-managed behavior. ::

    aws securityhub list-configuration-policy-associations \
        --filters '{"AssociationType": "APPLIED"}' \
        --max-items 4

Output::

    {
        "ConfigurationPolicyAssociationSummaries": [
            {
                "ConfigurationPolicyId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "TargetId": "r-1ab2",
                "TargetType": "ROOT",
                "AssociationType": "APPLIED",
                "UpdatedAt": "2023-11-28T19:26:49.417000+00:00",
                "AssociationStatus": "FAILED",
                "AssociationStatusMessage": "Policy association failed because 2 organizational units or accounts under this root failed."
            },
            {
                "ConfigurationPolicyId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "TargetId": "ou-1ab2-c3de4f5g",
                "TargetType": "ORGANIZATIONAL_UNIT",
                "AssociationType": "APPLIED",
                "UpdatedAt": "2023-09-26T21:14:05.283000+00:00",
                "AssociationStatus": "FAILED",
                "AssociationStatusMessage": "One or more children under this target failed association."
            },
            {
                "ConfigurationPolicyId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "TargetId": "ou-6hi7-8j91kl2m",
                "TargetType": "ORGANIZATIONAL_UNIT",
                "AssociationType": "APPLIED",
                "UpdatedAt": "2023-09-26T21:13:01.816000+00:00",
                "AssociationStatus": "SUCCESS",
                "AssociationStatusMessage": "Association applied successfully on this target."
            },
            {
                "ConfigurationPolicyId": "SELF_MANAGED_SECURITY_HUB",
                "TargetId": "111122223333",
                "TargetType": "ACCOUNT",
                "AssociationType": "APPLIED",
                "UpdatedAt": "2023-11-28T22:01:26.409000+00:00",
                "AssociationStatus": "SUCCESS"
        }
    }

For more information, see `Viewing configuration policy status and details <https://docs.aws.amazon.com/securityhub/latest/userguide/view-policy.html>`__ in the *AWS Security Hub User Guide*.