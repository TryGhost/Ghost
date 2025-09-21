**To list domains in a domain list**

The following ``list-firewall-domains`` example lists the domains in a DNS Firewall domain list that you specify. ::

    aws route53resolver list-firewall-domains \
        --firewall-domain-list-id rslvr-fdl-d61cbb2cbexample

Output::

    {
        "Domains": [
            "test1.com.",
            "test2.com.",
            "test3.com."
        ]
    }

For more information, see `Managing your own domain lists <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-user-managed-domain-lists.html>`__ in the *Amazon Route 53 Developer Guide*.