**To deprovision an address range**

The following ``deprovision-byoip-cidr`` example releases the specified address range that you provisioned to use with your AWS resources. ::

    aws globalaccelerator deprovision-byoip-cidr \
        --cidr "198.51.100.0/24"

Output::

    {
        "ByoipCidr": {
            "Cidr": "198.51.100.0/24",
            "State": "PENDING_DEPROVISIONING"
        }
    }

For more information, see `Bring your own IP address in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/using-byoip.html>`__ in the *AWS Global Accelerator Developer Guide*.