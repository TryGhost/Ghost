**To delete a firewall rule**

The following ``delete-firewall-rule`` example deletes a specified firewall rule. ::

    aws route53resolver delete-firewall-rule \
        --firewall-rule-group-id rslvr-frg-47f93271fexample \
        --firewall-domain-list-id rslvr-fdl-9e956e9ffexample

Output::

    {
        "FirewallRule": {
            "FirewallRuleGroupId": "rslvr-frg-47f93271fexample",
            "FirewallDomainListId": "rslvr-fdl-9e956e9ffexample",
            "Name": "allow-rule",
            "Priority": 102,
            "Action": "ALLOW",
            "CreatorRequestId": "d81e3fb7-020b-415e-939f-EXAMPLE11111",
            "CreationTime": "2021-05-25T21:44:00.346093Z",
            "ModificationTime": "2021-05-25T21:45:59.611600Z"
        }
    }

For more information, see `Managing rule groups and rules in DNS Firewall <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-rule-group-managing.html>`__ in the *Amazon Route 53 Developer Guide*.