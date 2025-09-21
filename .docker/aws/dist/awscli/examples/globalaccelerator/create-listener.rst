**To create a listener**

The following ``create-listener`` example creates a listener with two ports. ::

    aws globalaccelerator create-listener \
        --accelerator-arn arn:aws:globalaccelerator::123456789012:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh \
        --port-ranges FromPort=80,ToPort=80 FromPort=81,ToPort=81 \
        --protocol TCP

Output::

    {
        "Listener": {
            "PortRanges": [
                {
                    "ToPort": 80,
                    "FromPort": 80
                },
                {
                    "ToPort": 81,
                    "FromPort": 81
                }
            ],
            "ClientAffinity": "NONE",
            "Protocol": "TCP",
            "ListenerArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz"
        }
    }

For more information, see `Listeners in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-listeners.html>`__ in the *AWS Global Accelerator Developer Guide*.