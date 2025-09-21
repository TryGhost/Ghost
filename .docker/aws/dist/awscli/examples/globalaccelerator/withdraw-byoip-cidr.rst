**To withdraw an address range**

The following ``withdraw-byoip-cidr`` example withdraws an address range from AWS Global Accelerator that you previously advertised for use with your AWS resources. ::

    aws globalaccelerator withdraw-byoip-cidr \
        --cidr 192.0.2.250/24

Output::

    {
        "ByoipCidr": {
            "Cidr": "192.0.2.250/24",
            "State": "PENDING_WITHDRAWING"
        }
    }

For more information, see `Bring your own IP address in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/using-byoip.html>`__ in the *AWS Global Accelerator Developer Guide*.