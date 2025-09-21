**To describe your IPv6 address pools**

The following ``describe-ipv6-pools`` example displays details for all of your IPv6 address pools. ::

    aws ec2 describe-ipv6-pools

Output::

    {
        "Ipv6Pools": [
            {
                "PoolId": "ipv6pool-ec2-012345abc12345abc",
                "PoolCidrBlocks": [
                    {
                        "Cidr": "2001:db8:123::/48"
                    }
                ],
                "Tags": [
                    {
                        "Key": "pool-1",
                        "Value": "public"
                    }
                ]
            }
        ]
    }
