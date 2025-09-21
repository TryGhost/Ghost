**To associate a Resolver rule with a VPC**

The following ``associate-resolver-rule`` example associates a Resolver rule with an Amazon VPC. After you run the command, Resolver starts to forward DNS queries to your network based on the settings in the rule, such as the domain name of the queries that are forwarded. ::

    aws route53resolver associate-resolver-rule \
        --name my-resolver-rule-association \ 
        --resolver-rule-id rslvr-rr-42b60677c0example \ 
        --vpc-id vpc-304bexam 

Output::

    {
        "ResolverRuleAssociation": {
            "Id": "rslvr-rrassoc-d61cbb2c8bexample",
            "ResolverRuleId": "rslvr-rr-42b60677c0example",
            "Name": "my-resolver-rule-association",
            "VPCId": "vpc-304bexam",
            "Status": "CREATING",
            "StatusMessage": "[Trace id: 1-5dc5a8fa-ec2cc480d2ef07617example] Creating the association."
        }
    }

For more information, see `Forwarding Outbound DNS Queries to Your Network <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-outbound-queries.html>`__ in the *Amazon Route 53 Developer Guide*.
