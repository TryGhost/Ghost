**To retrieve all Firewall Manager policies**

The following ``list-policies`` example retrieves the list of policies for the account. In this example, the output is limited to two results per request. Each call returns a ``NextToken`` that can be used as the value for the ``--starting-token`` parameter in the next ``list-policies`` call to get the next set of results for the list. ::

    aws fms list-policies \
        --max-items 2
         
Output::

    {
        "PolicyList": [
            {
                "PolicyArn": "arn:aws:fms:us-west-2:123456789012:policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "PolicyId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "PolicyName": "test",
                "ResourceType": "AWS::EC2::Instance",
                "SecurityServiceType": "SECURITY_GROUPS_COMMON",
                "RemediationEnabled": false
            },
            {
                "PolicyArn": "arn:aws:fms:us-west-2:123456789012:policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "PolicyId": "457c9b21-fc94-406c-ae63-21217395ba72",
                "PolicyName": "test",
                "ResourceType": "AWS::EC2::Instance",
                "SecurityServiceType": "SECURITY_GROUPS_COMMON",
                "RemediationEnabled": false
            }
        ],
        "NextToken": "eyJOZXh0VG9rZW4iOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAyfQ=="
    }
    
For more information, see `Working with AWS Firewall Manager Policies <https://docs.aws.amazon.com/waf/latest/developerguide/working-with-policies.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
