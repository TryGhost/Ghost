**To update a domain list**

The following ``update-firewall-domains`` example adds the domains to a domain list with the ID you provide. ::

    aws route53resolver update-firewall-domains \
        --firewall-domain-list-id rslvr-fdl-42b60677cexampleb \
        --operation ADD \
        --domains test1.com test2.com test3.com

Output::

    {
        "Id": "rslvr-fdl-42b60677cexample",
        "Name": "test",
        "Status": "UPDATING",
        "StatusMessage": "Updating the Firewall Domain List"
    }

For more information, see `Managing your own domain lists <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-user-managed-domain-lists.html>`__ in the *Amazon Route 53 Developer Guide*.