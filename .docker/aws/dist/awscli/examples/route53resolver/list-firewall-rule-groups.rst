**To get a list of your Firewall rule groups**

The following ``list-firewall-rule-groups`` example lists your DNS Firewall rule groups. ::

    aws route53resolver list-firewall-rule-groups

Output::

    {
        "FirewallRuleGroups": [
            {
                "Id": "rslvr-frg-47f93271fexample",
                "Arn": "arn:aws:route53resolver:us-west-2:123456789012:firewall-rule-group/rslvr-frg-47f93271fexample",
                "Name": "test",
                "OwnerId": "123456789012",
                "CreatorRequestId": "my-request-id",
                "ShareStatus": "NOT_SHARED"
            }
        ]
    }

For more information, see `Managing rule groups and rules in DNS Firewall <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-rule-group-managing.html>`__ in the *Amazon Route 53 Developer Guide*.