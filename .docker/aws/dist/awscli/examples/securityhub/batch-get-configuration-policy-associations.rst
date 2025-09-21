**To get configuration association details for a batch of targets**

The following ``batch-get-configuration-policy-associations`` example retrieves association details for the specified targets. You can provide account IDs, organizational unit IDs, or the root ID for the target. ::

    aws securityhub batch-get-configuration-policy-associations \
        --target '{"OrganizationalUnitId": "ou-6hi7-8j91kl2m"}'

Output::

    {
        "ConfigurationPolicyId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
        "TargetId": "ou-6hi7-8j91kl2m",
        "TargetType": "ORGANIZATIONAL_UNIT",
        "AssociationType": "APPLIED",
        "UpdatedAt": "2023-09-26T21:13:01.816000+00:00",
        "AssociationStatus": "SUCCESS",
        "AssociationStatusMessage": "Association applied successfully on this target."
    }

For more information, see `Viewing Security Hub configuration policies <https://docs.aws.amazon.com/securityhub/latest/userguide/view-policy.html>`__ in the *AWS Security Hub User Guide*.