**To list all of Route 53 Resolver DNS Firewall domain lists**

The following ``list-firewall-domain-lists`` example lists all the domain lists. ::

    aws route53resolver list-firewall-domain-lists 

Output::

    {
        "FirewallDomainLists": [
            {
                "Id": "rslvr-fdl-2c46f2ecfexample",
                "Arn": "arn:aws:route53resolver:us-west-2:123456789012:firewall-domain-list/rslvr-fdl-2c46f2ecfexample",
                "Name": "AWSManagedDomainsMalwareDomainList",
                "CreatorRequestId": "AWSManagedDomainsMalwareDomainList",
                "ManagedOwnerName": "Route 53 Resolver DNS Firewall"
            },
            {
                "Id": "rslvr-fdl-aa970e9e1example",
                "Arn": "arn:aws:route53resolver:us-west-2:123456789012:firewall-domain-list/rslvr-fdl-aa970e9e1example",
                "Name": "AWSManagedDomainsBotnetCommandandControl",
                "CreatorRequestId": "AWSManagedDomainsBotnetCommandandControl",
                "ManagedOwnerName": "Route 53 Resolver DNS Firewall"
            },
            {
                "Id": "rslvr-fdl-42b60677cexample",
                "Arn": "arn:aws:route53resolver:us-west-2:123456789111:firewall-domain-list/rslvr-fdl-42b60677cexample",
                "Name": "test",
                "CreatorRequestId": "my-request-id"
            }
        ]
    }

For more information, see `Route 53 Resolver DNS Firewall domain lists <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-domain-lists.html>`__ in the *Amazon Route 53 Developer Guide*.