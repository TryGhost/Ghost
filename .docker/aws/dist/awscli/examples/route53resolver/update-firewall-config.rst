**To update a firewall config**

The following ``update-firewall-config`` example updates DNS Firewall configuration. ::

    aws route53resolver update-firewall-config \
        --resource-id vpc-31e92222 \
        --firewall-fail-open DISABLED 

Output::

    {
        "FirewallConfig": {
            "Id": "rslvr-fc-86016850cexample",
            "ResourceId": "vpc-31e92222",
            "OwnerId": "123456789012",
            "FirewallFailOpen": "DISABLED"
        }
    }

For more information, see `DNS Firewall VPC configuration <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-vpc-configuration.html>`__ in the *Amazon Route 53 Developer Guide*.