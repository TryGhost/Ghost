**To describe your provisioned address ranges**

The following ``describe-byoip-cidrs`` example displays details about the public IPv4 address ranges that you provisioned for use by AWS. ::

    aws ec2 describe-byoip-cidrs

Output::

    {
        "ByoipCidrs": [
            {
                "Cidr": "203.0.113.25/24",
                "StatusMessage": "ipv4pool-ec2-1234567890abcdef0",
                "State": "provisioned"
            }
        ]
    }
