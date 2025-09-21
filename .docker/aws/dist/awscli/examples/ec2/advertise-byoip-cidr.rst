**To advertise an address range**

The following ``advertise-byoip-cidr`` example advertises the specified public IPv4 address range. ::

    aws ec2 advertise-byoip-cidr \
        --cidr 203.0.113.25/24

Output::

    {
        "ByoipCidr": {
            "Cidr": "203.0.113.25/24",
            "StatusMessage": "ipv4pool-ec2-1234567890abcdef0",
            "State": "provisioned"
        }
    }
