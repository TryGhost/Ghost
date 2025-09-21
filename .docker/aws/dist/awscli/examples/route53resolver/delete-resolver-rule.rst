**To delete a Resolver rule**

The following ``delete-resolver-rule`` example deletes the specified rule. 

**Note** If a rule is associated with any VPCs, you must first disassociate the rule from the VPCs before you can delete it. ::

    aws route53resolver delete-resolver-rule \
        --resolver-rule-id rslvr-rr-5b3809426bexample

Output::

    {
        "ResolverRule": {
            "Id": "rslvr-rr-5b3809426bexample",
            "CreatorRequestId": "2020-01-03-18:47",
            "Arn": "arn:aws:route53resolver:us-west-2:111122223333:resolver-rule/rslvr-rr-5b3809426bexample",
            "DomainName": "zenith.example.com.",
            "Status": "DELETING",
            "StatusMessage": "[Trace id: 1-5dc5e05b-602e67b052cb74f05example] Deleting Resolver Rule.",
            "RuleType": "FORWARD",
            "Name": "my-resolver-rule",
            "TargetIps": [
                {
                    "Ip": "192.0.2.50",
                    "Port": 53
                }
            ],
            "ResolverEndpointId": "rslvr-out-d5e5920e3example",
            "OwnerId": "111122223333",
            "ShareStatus": "NOT_SHARED"
        }
    }
