**To list DNS Firewall rule group associations**

The following ``list-firewall-rule-group-associations`` example lists your DNS Firewall rule group associations with Amazon VPCs. ::

    aws route53resolver list-firewall-rule-group-associations

Output::

    {
        "FirewallRuleGroupAssociations": [
            {
                "Id": "rslvr-frgassoc-57e8873d7example",
                "Arn": "arn:aws:route53resolver:us-west-2:123456789012:firewall-rule-group-association/rslvr-frgassoc-57e8873d7example",
                "FirewallRuleGroupId": "rslvr-frg-47f93271fexample",
                "VpcId": "vpc-31e92222",
                "Name": "test-association",
                "Priority": 101,
                "MutationProtection": "DISABLED",
                "Status": "UPDATING",
                "StatusMessage": "Creating Firewall Rule Group Association",
                "CreatorRequestId": "2ca1a304-32b3-4f5f-bc4c-EXAMPLE11111",
                "CreationTime": "2021-05-25T21:47:48.755768Z",
                "ModificationTime": "2021-05-25T21:47:48.755768Z"
            }
        ]
    }

For more information, see `Managing associations between your VPC and Route 53 Resolver DNS Firewall rule group <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-vpc-associating-rule-group.html>`__ in the *Amazon Route 53 Developer Guide*.