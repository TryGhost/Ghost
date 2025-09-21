**To list firewall configs**

The following ``list-firewall-configs`` example lists your DNS Firewall configurations. ::

    aws route53resolver list-firewall-configs

Output::

    {
        "FirewallConfigs": [
            {
                "Id": "rslvr-fc-86016850cexample",
                "ResourceId": "vpc-31e92222",
                "OwnerId": "123456789012",
                "FirewallFailOpen": "DISABLED"
            }
        ]
    }

For more information, see `DNS Firewall VPC configuration <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-vpc-configuration.html>`__ in the *Amazon Route 53 Developer Guide*.