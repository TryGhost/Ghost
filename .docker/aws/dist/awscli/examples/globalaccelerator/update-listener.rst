**To update a listener**

The following ``update-listener`` example updates a listener to change the port to 100. ::

    aws globalaccelerator update-listener \
        --listener-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz \
        --port-ranges FromPort=100,ToPort=100 

Output::

    {
        "Listener": {
            "ListenerArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz
            "PortRanges": [
                {
                    "FromPort": 100,
                    "ToPort": 100
                }
            ],
            "Protocol": "TCP",
            "ClientAffinity": "NONE"
        }
    }

For more information, see `Listeners in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-listeners.html>`__ in the *AWS Global Accelerator Developer Guide*.