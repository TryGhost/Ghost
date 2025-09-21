**To retrieve the compliance information for an account**

The following ``get-compliance-detail`` example retrieves compliance information for the specified policy and member account. ::

    aws fms get-compliance-detail \
        --policy-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --member-account 123456789012
         
Output::

    {
        "PolicyComplianceDetail": {
        "EvaluationLimitExceeded": false,
        "IssueInfoMap": {},
        "MemberAccount": "123456789012",
        "PolicyId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "PolicyOwner": "123456789012",
        "Violators": []
    }
    
For more information, see `Viewing Resource Compliance with a Policy <https://docs.aws.amazon.com/waf/latest/developerguide/fms-compliance.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
