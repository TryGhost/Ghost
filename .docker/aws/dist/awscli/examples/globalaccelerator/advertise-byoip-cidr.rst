**To advertise an address range**

The following ``advertise-byoip-cidr`` example requests AWS to advertise an address range that you've provisioned for use with your AWS resources. ::

    aws globalaccelerator advertise-byoip-cidr \
        --cidr 198.51.100.0/24

Output::

    {
        "ByoipCidr": {
            "Cidr": "198.51.100.0/24",
            "State": "PENDING_ADVERTISING"
        }
    }

For more information, see `Bring Your Own IP Address in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/using-byoip.html>`__ in the *AWS Global Accelerator Developer Guide*.