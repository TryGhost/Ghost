**To provision an address range**

The following ``provision-byoip-cidr`` example provisions the specified address range to use with your AWS resources. ::

    aws globalaccelerator provision-byoip-cidr \
        --cidr 192.0.2.250/24 \
        --cidr-authorization-context Message="$text_message",Signature="$signed_message"

Output::

    {
        "ByoipCidr": {
            "Cidr": "192.0.2.250/24",
            "State": "PENDING_PROVISIONING"
        }
    }

For more information, see `Bring your own IP address in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/using-byoip.html>`__ in the *AWS Global Accelerator Developer Guide*.