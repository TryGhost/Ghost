**To create a Route 53 Resolver DNS Firewall domain list**

The following ``create-firewall-domain-list`` example creates a Route 53 Resolver DNS Firewall domain list, named test, in your AWS account. ::

    aws route53resolver create-firewall-domain-list \
        --creator-request-id my-request-id \
        --name test

Output::

    {
        "FirewallDomainList": {
            "Id": "rslvr-fdl-d61cbb2cbexample",
            "Arn": "arn:aws:route53resolver:us-west-2:123456789012:firewall-domain-list/rslvr-fdl-d61cbb2cbexample",
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