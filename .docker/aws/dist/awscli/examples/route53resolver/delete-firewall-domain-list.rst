**To delete a Route 53 Resolver DNS Firewall domain list**

The following ``delete-firewall-domain-list`` example deletes a Route 53 Resolver DNS Firewall domain list, named test, in your AWS account. ::

    aws route53resolver delete-firewall-domain-list \
        --firewall-domain-list-id rslvr-fdl-9e956e9ffexample

Output::

    {
        "FirewallDomainList": {
            "Id": "rslvr-fdl-9e956e9ffexample",
            "Arn": "arn:aws:route53resolver:us-west-2:123456789012:firewall-domain-list/rslvr-fdl-9e956e9ffexample",
            "Name": "test",
            "DomainCount": 6,
            "Status": "DELETING",
            "StatusMessage": "Deleting the Firewall Domain List",
            "CreatorRequestId": "my-request-id",
            "CreationTime": "2021-05-25T15:55:51.115365Z",
            "ModificationTime": "2021-05-25T18:58:05.588024Z"
        }
    }

For more information, see `Managing your own domain lists <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-user-managed-domain-lists.html>`__ in the *Amazon Route 53 Developer Guide*.