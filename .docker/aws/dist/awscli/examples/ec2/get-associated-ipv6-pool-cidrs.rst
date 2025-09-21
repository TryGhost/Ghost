**To get the associations for an IPv6 address pool**

The following ``get-associated-ipv6-pool-cidrs`` example gets the associations for the specified IPv6 address pool. ::

    aws ec2 get-associated-ipv6-pool-cidrs \
        --pool-id ipv6pool-ec2-012345abc12345abc

Output::

    {
        "Ipv6CidrAssociations": [
            {
                "Ipv6Cidr": "2001:db8:1234:1a00::/56",
                "AssociatedResource": "vpc-111111222222333ab"
            }
        ]
    }
