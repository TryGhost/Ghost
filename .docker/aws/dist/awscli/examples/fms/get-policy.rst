**To retrieve a Firewall Manager policy**

The following ``get-policy`` example retrieves the policy with the specified ID. ::

    aws fms get-policy \
        --policy-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    { 
        "Policy": {
            "PolicyId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "PolicyName": "test",
            "PolicyUpdateToken": "1:p+2RpKR4wPFx7mcrL1UOQQ==",
            "SecurityServicePolicyData": {
                "Type": "SECURITY_GROUPS_COMMON",
                "ManagedServiceData": "{\"type\":\"SECURITY_GROUPS_COMMON\",\"revertManualSecurityGroupChanges\":true,\"exclusiveResourceSecurityGroupManagement\":false,\"securityGroups\":[{\"id\":\"sg-045c43ccc9724e63e\"}]}"
            },
            "ResourceType": "AWS::EC2::Instance",
            "ResourceTags": [],
            "ExcludeResourceTags": false,
            "RemediationEnabled": false
        },
        "PolicyArn": "arn:aws:fms:us-west-2:123456789012:policy/d1ac59b8-938e-42b3-b2e0-7c620422ddc2"
    }  

For more information, see `Working with AWS Firewall Manager Policies <https://docs.aws.amazon.com/waf/latest/developerguide/working-with-policies.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
