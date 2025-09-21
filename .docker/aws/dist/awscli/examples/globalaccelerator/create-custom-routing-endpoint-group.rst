**To create an endpoint group for a custom routing accelerator**

The following ``create-custom-routing-endpoint-group`` example creates an endpoint group for a custom routing accelerator. ::

    aws globalaccelerator create-custom-routing-endpoint-group \
        --listener-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz \
        --endpoint-group-region us-east-2 \
        --destination-configurations "FromPort=80,ToPort=81,Protocols=TCP,UDP"

Output::

    {
        "EndpointGroup": {
            "EndpointGroupArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz/endpoint-group/4321abcd",
            "EndpointGroupRegion": "us-east-2",
            "DestinationDescriptions": [
                {
                    "FromPort": 80,
                    "ToPort": 81,
                    "Protocols": [
                        "TCP",
                        "UDP"
                    ]
                }
            ],
            "EndpointDescriptions": []
        }
    }

For more information, see `Endpoint groups for custom routing accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-endpoint-groups.html>`__ in the *AWS Global Accelerator Developer Guide*.