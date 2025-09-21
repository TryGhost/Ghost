**To list the port mappings in a custom routing accelerator**

The following ``list-custom-routing-port-mappings`` example provides a partial list of the port mappings in a custom routing accelerator. ::

    aws globalaccelerator list-custom-routing-port-mappings \
        --accelerator-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh

Output::

    {
        "PortMappings": [ 
            { 
                "AcceleratorPort": 40480,
                "EndpointGroupArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz/endpoint-group/098765zyxwvu",
                "EndpointId": "subnet-1234567890abcdef0",
                "DestinationSocketAddress": { 
                    "IpAddress": "192.0.2.250",
                    "Port": 80
                },
                "Protocols": [
                    "TCP",
                    "UDP"
                ],
                "DestinationTrafficState": "ALLOW"
            }
            { 
                "AcceleratorPort": 40481,
                "EndpointGroupArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz/endpoint-group/098765zyxwvu",
                "EndpointId": "subnet-1234567890abcdef0",
                "DestinationSocketAddress": { 
                   "IpAddress": "192.0.2.251",
                  "Port": 80
                },
                "Protocols": [
                    "TCP",
                    "UDP"
                ],
                "DestinationTrafficState": "ALLOW"
            }
        ]
    }

For more information, see `How custom routing accelerators work in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-how-it-works.html>`__ in the *AWS Global Accelerator Developer Guide*.