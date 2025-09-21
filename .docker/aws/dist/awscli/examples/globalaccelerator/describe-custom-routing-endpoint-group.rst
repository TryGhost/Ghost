**To describe an endpoint group for a custom routing accelerator**

The following ``describe-custom-routing-endpoint-group`` example describes an endpoint group for a custom routing accelerator. ::

    aws globalaccelerator describe-custom-routing-endpoint-group \
        --endpoint-group-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/6789vxyz/endpoint-group/ab88888example

Output::

    {
        "EndpointGroup": {
            "EndpointGroupArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/6789vxyz/endpoint-group/ab88888example",
            "EndpointGroupRegion": "us-east-2",
            "DestinationDescriptions": [
                {
                    "FromPort": 5000,
                    "ToPort": 10000,
                    "Protocols": [
                        "UDP"
                    ]
                }
            ],
            "EndpointDescriptions": [
                {
                    "EndpointId": "subnet-1234567890abcdef0"
                }
            ]
        }
    }

For more information, see `Endpoint groups for custom routing accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-endpoint-groups.html>`__ in the *AWS Global Accelerator Developer Guide*.