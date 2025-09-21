**To get compliance information for your AWS Config rules**

The following command returns compliance information for each AWS Config rule that is violated by one or more AWS resources::

    aws configservice describe-compliance-by-config-rule --compliance-types NON_COMPLIANT

In the output, the value for each ``CappedCount`` attribute indicates how many resources do not comply with the related rule. For example, the following output indicates that 3 resources do not comply with the rule named ``InstanceTypesAreT2micro``.

Output::

    {
        "ComplianceByConfigRules": [
            {
                "Compliance": {
                    "ComplianceContributorCount": {
                        "CappedCount": 3,
                        "CapExceeded": false
                    },
                    "ComplianceType": "NON_COMPLIANT"
                },
                "ConfigRuleName": "InstanceTypesAreT2micro"
            },
            {
                "Compliance": {
                    "ComplianceContributorCount": {
                        "CappedCount": 10,
                        "CapExceeded": false
                    },
                    "ComplianceType": "NON_COMPLIANT"
                },
                "ConfigRuleName": "RequiredTagsForVolumes"
            }
        ]
    }