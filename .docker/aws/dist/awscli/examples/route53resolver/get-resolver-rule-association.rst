**To get information about the association between a Resolver rule and a VPC**

The following ``get-resolver-rule-association`` example displays details about the association between a specified Resolver rule and a VPC. You associate a resolver rule and a VPC using `associate-resolver-rule <https://docs.aws.amazon.com/cli/latest/reference/route53resolver/associate-resolver-rule.html>`__. ::

    aws route53resolver get-resolver-rule-association \
        --resolver-rule-association-id rslvr-rrassoc-d61cbb2c8bexample

Output::

    {
        "ResolverRuleAssociation": {
            "Id": "rslvr-rrassoc-d61cbb2c8bexample",
            "ResolverRuleId": "rslvr-rr-42b60677c0example",
            "Name": "my-resolver-rule-association",
            "VPCId": "vpc-304bexam",
            "Status": "COMPLETE",
            "StatusMessage": ""
        }
    }
