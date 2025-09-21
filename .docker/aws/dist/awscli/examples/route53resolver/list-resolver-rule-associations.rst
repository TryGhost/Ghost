**To list associations between Resolver rules and VPCs**

The following ``list-resolver-rule-associations`` example lists the associations between resolver rules and VPCs in the current AWS account. ::

    aws route53resolver list-resolver-rule-associations 

Output::

    {
        "MaxResults": 30,
        "ResolverRuleAssociations": [
            {
                "Id": "rslvr-autodefined-assoc-vpc-304bexam-internet-resolver",
                "ResolverRuleId": "rslvr-autodefined-rr-internet-resolver",
                "Name": "System Rule Association",
                "VPCId": "vpc-304bexam",
                "Status": "COMPLETE",
                "StatusMessage": ""
            },
            {
                "Id": "rslvr-rrassoc-d61cbb2c8bexample",
                "ResolverRuleId": "rslvr-rr-42b60677c0example",
                "Name": "my-resolver-rule-association",
                "VPCId": "vpc-304bexam",
                "Status": "COMPLETE",
                "StatusMessage": ""
            }
        ]
    }

For more information, see `How Route 53 Resolver Forwards DNS Queries from Your VPCs to Your Network <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html#resolver-overview-forward-vpc-to-network>`__ in the *Amazon Route 53 Developer Guide*.
