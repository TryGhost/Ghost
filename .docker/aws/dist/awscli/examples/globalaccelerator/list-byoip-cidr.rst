**To list your address ranges**

The following ``list-byoip-cidr`` example list the bring your own IP address (BYOIP) address ranges that you've provisioned for use with Global Accelerator. ::

    aws globalaccelerator list-byoip-cidrs

Output::

    {
        "ByoipCidrs": [
            {
                "Cidr": "198.51.100.0/24",
                "State": "READY"
            }
            {
                "Cidr": "203.0.113.25/24",
                "State": "READY"
            }
        ]
    }

For more information, see `Bring your own IP address in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/using-byoip.html>`__ in the *AWS Global Accelerator Developer Guide*.