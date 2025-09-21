**To describe local gateway virtual interfaces**

The following ``describe-local-gateway-virtual-interfaces`` example describes the local gateway virtual interfaces in your AWS account. ::

    aws ec2 describe-local-gateway-virtual-interfaces

Output::

    {
        "LocalGatewayVirtualInterfaces": [
            {
                "LocalGatewayVirtualInterfaceId": "lgw-vif-01a23bc4d5EXAMPLE",
                "LocalGatewayId": "lgw-0ab1c23d4eEXAMPLE",
                "Vlan": 2410,
                "LocalAddress": "0.0.0.0/0",
                "PeerAddress": "0.0.0.0/0",
                "LocalBgpAsn": 65010,
                "PeerBgpAsn": 65000,
                "OwnerId": "123456789012",
                "Tags": []
            },
            {
                "LocalGatewayVirtualInterfaceId": "lgw-vif-543ab21012EXAMPLE",
                "LocalGatewayId": "lgw-0ab1c23d4eEXAMPLE",
                "Vlan": 2410,
                "LocalAddress": "0.0.0.0/0",
                "PeerAddress": "0.0.0.0/0",
                "LocalBgpAsn": 65010,
                "PeerBgpAsn": 65000,
                "OwnerId": "123456789012",
                "Tags": []
            }
        ]
    }

For more information, see `Working with local gateways <https://docs.aws.amazon.com/outposts/latest/userguide/outposts-local-gateways.html>`__ in the *AWS Outposts User Guide*.
