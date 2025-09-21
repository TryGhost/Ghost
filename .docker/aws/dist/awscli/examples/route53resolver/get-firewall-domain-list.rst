**To get a Route 53 Resolver DNS Firewall domain list**

The following ``get-firewall-domain-list`` example retrieves the domain list with the ID you specify. ::

    aws route53resolver get-firewall-domain-list \
        --firewall-domain-list-id rslvr-fdl-42b60677cexample

Output::

    {
        "FirewallDomainList": {
            "Id": "rslvr-fdl-9e956e9ffexample",
            "Arn": "arn:aws:route53resolver:us-west-2:123457689012:firewall-domain-list/rslvr-fdl-42b60677cexample",
            "Name": "test",
            "DomainCount": 0,
            "Status": "COMPLETE",
            "StatusMessage": "Created Firewall Domain List",
            "CreatorRequestId": "my-request-id",
            "CreationTime": "2021-05-25T15:55:51.115365Z",
            "ModificationTime": "2021-05-25T15:55:51.115365Z"
        }
    }

For more information, see `Managing your own domain lists <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-user-managed-domain-lists.html>`__ in the *Amazon Route 53 Developer Guide*.