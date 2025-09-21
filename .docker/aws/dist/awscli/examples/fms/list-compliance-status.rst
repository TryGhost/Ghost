**To retrieve the policy compliance information for member accounts**

The following ``list-compliance-status`` example retrieves member account compliance information for the specified policy. ::

    aws fms list-compliance-status \
        --policy-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "PolicyComplianceStatusList": [
            {
                "PolicyOwner": "123456789012",
                "PolicyId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "PolicyName": "test",
                "MemberAccount": "123456789012",
                "EvaluationResults": [
                    {
                        "ComplianceStatus": "COMPLIANT",
                        "ViolatorCount": 0,
                        "EvaluationLimitExceeded": false
                    },
                    {
                        "ComplianceStatus": "NON_COMPLIANT",
                        "ViolatorCount": 2,
                        "EvaluationLimitExceeded": false
                    }
                ],
                "LastUpdated": 1576283774.0,
                "IssueInfoMap": {}
            }
        ]
    }

For more information, see `Viewing Resource Compliance with a Policy <https://docs.aws.amazon.com/waf/latest/developerguide/fms-compliance.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
