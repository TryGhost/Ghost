**To describe your public IPv4 address pools**

The following ``describe-public-ipv4-pools`` example displays details about the address pools that were created when you provisioned public IPv4 address ranges using Bring Your Own IP Addresses (BYOIP). ::

    aws ec2 describe-public-ipv4-pools

Output::

    {
        "PublicIpv4Pools": [
            {
                "PoolId": "ipv4pool-ec2-1234567890abcdef0",
                "PoolAddressRanges": [
                    {
                        "FirstAddress": "203.0.113.0",
                        "LastAddress": "203.0.113.255",
                        "AddressCount": 256,
                        "AvailableAddressCount": 256
                    }
                ],
                "TotalAddressCount": 256,
                "TotalAvailableAddressCount": 256
            }
        ]
    }
