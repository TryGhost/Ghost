**To list Resolver rules**

The following ``list-resolver-rules`` example lists all the Resolver rules in the current AWS account. ::

    aws route53resolver list-resolver-rules 

Output::

    {
        "MaxResults": 30,
        "ResolverRules": [
            {
                "Id": "rslvr-autodefined-rr-internet-resolver",
                "CreatorRequestId": "",
                "Arn": "arn:aws:route53resolver:us-west-2::autodefined-rule/rslvr-autodefined-rr-internet-resolver",
                "DomainName": ".",
                "Status": "COMPLETE",
                "RuleType": "RECURSIVE",
                "Name": "Internet Resolver",
                "OwnerId": "Route 53 Resolver",
                "ShareStatus": "NOT_SHARED"
            },
            {
                "Id": "rslvr-rr-42b60677c0example",
                "CreatorRequestId": "2020-01-01-18:47",
                "Arn": "arn:aws:route53resolver:us-west-2:111122223333:resolver-rule/rslvr-rr-42b60677c0bc4e299",
                "DomainName": "example.com.",
                "Status": "COMPLETE",
                "StatusMessage": "[Trace id: 1-5dc4b177-ff1d9d001a0f80005example] Successfully created Resolver Rule.",
                "RuleType": "FORWARD",
                "Name": "my-rule",
                "TargetIps": [
                    {
                        "Ip": "192.0.2.45",
                        "Port": 53
                    }
                ],
                "ResolverEndpointId": "rslvr-out-d5e5920e37example",
                "OwnerId": "111122223333",
                "ShareStatus": "NOT_SHARED"
            }
        ]
    }

For more information, see `How Route 53 Resolver Forwards DNS Queries from Your VPCs to Your Network <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html#resolver-overview-forward-vpc-to-network>`__ in the *Amazon Route 53 Developer Guide*.
