**To describe a listener for a custom routing accelerator**

The following ``describe-custom-routing-listener`` example describes a listener for a custom routing accelerator. ::

    aws globalaccelerator describe-custom-routing-listener \
        --listener-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/abcdef1234

Output::

    {
        "Listener": {
            "PortRanges": [
                "FromPort": 5000,
                "ToPort": 10000
            ],
            "ListenerArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/abcdef1234"
        }
    }

For more information, see `Listeners for custom routing accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-listeners.html>`__ in the *AWS Global Accelerator Developer Guide*.