**To create a listener for a custom routing accelerator**

The following ``create-custom-routing-listener`` example creates a listener with a port range from 5000 to 10000 for a custom routing accelerator. ::

    aws globalaccelerator create-custom-routing-listener \
        --accelerator-arn arn:aws:globalaccelerator::123456789012:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh \
        --port-ranges FromPort=5000,ToPort=10000

Output::

    {
        "Listener": {
            "PortRange": [
                "FromPort": 5000,
                "ToPort": 10000
            ],
            "ListenerArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz"
        }
    }

For more information, see `Listeners for custom routing accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-listeners.html>`__ in the *AWS Global Accelerator Developer Guide*.
