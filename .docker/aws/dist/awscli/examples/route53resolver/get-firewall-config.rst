**To get a firewall config for a VPC**

The following ``get-firewall-config`` example retrieves the DNS Firewall behavior for the specified VPC. ::

    aws route53resolver get-firewall-config \
        --resource-id vpc-31e92222

Output::

    {
        "FirewallConfig": {
            "Id": "rslvr-fc-86016850cexample",
            "ResourceId": "vpc-31e9222",
            "OwnerId": "123456789012",
            "FirewallFailOpen": "DISABLED"
        }
    }

For more information, see `DNS Firewall VPC configuration <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-vpc-configuration.html>`__ in the *Amazon Route 53 Developer Guide*.