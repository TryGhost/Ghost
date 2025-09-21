**To get a Firewall rule group**

The following ``get-firewall-rule-group`` example retrieves information about a DNS Firewall rule group with the ID you provide. ::

    aws route53resolver get-firewall-rule-group \
        --firewall-rule-group-id rslvr-frg-47f93271fexample

Output::

    {
        "FirewallRuleGroup": {
            "Id": "rslvr-frg-47f93271fexample",
            "Arn": "arn:aws:route53resolver:us-west-2:123456789012:firewall-rule-group/rslvr-frg-47f93271fexample",
            "Name": "test",
            "RuleCount": 0,
            "Status": "COMPLETE",
            "StatusMessage": "Created Firewall Rule Group",
            "OwnerId": "123456789012",
            "CreatorRequestId": "my-request-id",
            "ShareStatus": "NOT_SHARED",
            "CreationTime": "2021-05-25T18:59:26.490017Z",
            "ModificationTime": "2021-05-25T18:59:26.490017Z"
        }
    }

For more information, see `Managing rule groups and rules in DNS Firewall <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-rule-group-managing.html>`__ in the *Amazon Route 53 Developer Guide*.