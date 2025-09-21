**To remove an IP address range from use**

The following example removes the specified address range from use with AWS. ::

    aws ec2 deprovision-byoip-cidr \
        --cidr 203.0.113.25/24

Output::

    {
        "ByoipCidr": {
            "Cidr": "203.0.113.25/24",
            "State": "pending-deprovision"
        }
    }
