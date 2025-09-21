**To create a Firewall Manager policy**

The following ``put-policy`` example creates a Firewall Manager security group policy. ::

    aws fms put-policy \
        --cli-input-json file://policy.json
         
Contents of ``policy.json``::

    {
        "Policy": {
            "PolicyName": "test",
            "SecurityServicePolicyData": {
                "Type": "SECURITY_GROUPS_USAGE_AUDIT",
                "ManagedServiceData": "{\"type\":\"SECURITY_GROUPS_USAGE_AUDIT\",\"deleteUnusedSecurityGroups\":false,\"coalesceRedundantSecurityGroups\":true}"
            },
            "ResourceType": "AWS::EC2::SecurityGroup",
            "ResourceTags": [],
            "ExcludeResourceTags": false,
            "RemediationEnabled": false
        },
        "TagList": [
            {
                "Key": "foo",
                "Value": "foo"
            }
        ]
    }

Output::

    {
        "Policy": {
            "PolicyId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "PolicyName": "test",
            "PolicyUpdateToken": "1:X9QGexP7HASDlsFp+G31Iw==",
            "SecurityServicePolicyData": {
                "Type": "SECURITY_GROUPS_USAGE_AUDIT",
                "ManagedServiceData": "{\"type\":\"SECURITY_GROUPS_USAGE_AUDIT\",\"deleteUnusedSecurityGroups\":false,\"coalesceRedundantSecurityGroups\":true,\"optionalDelayForUnusedInMinutes\":null}"
            },
            "ResourceType": "AWS::EC2::SecurityGroup",
            "ResourceTags": [],
            "ExcludeResourceTags": false,
            "RemediationEnabled": false
        },
        "PolicyArn": "arn:aws:fms:us-west-2:123456789012:policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Working with AWS Firewall Manager Policies <https://docs.aws.amazon.com/waf/latest/developerguide/working-with-policies.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
