**To list listeners for custom routing accelerators**

The following ``list-custom-routing-listeners`` example lists the listeners for a custom routing accelerator. ::

    aws globalaccelerator list-custom-routing-listeners \
        --accelerator-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh

Output::

    {
        "Listeners": [
            {
                "ListenerArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/abcdef1234",
                "PortRanges": [
                    {
                        "FromPort": 5000,
                        "ToPort": 10000
                    }
                ],
                "Protocol": "TCP"
            }
        ]
    }

For more information, see `Listeners for custom routing accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-listeners.html>`__ in the *AWS Global Accelerator Developer Guide*.