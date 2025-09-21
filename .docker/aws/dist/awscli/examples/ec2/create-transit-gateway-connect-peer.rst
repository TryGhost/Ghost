**To create a Transit Gateway Connect peer**

The following ``create-transit-gateway-connect-peer`` example creates a Connect peer. ::

    aws ec2 create-transit-gateway-connect-peer \
        --transit-gateway-attachment-id tgw-attach-0f0927767cEXAMPLE \
        --peer-address 172.31.1.11 \
        --inside-cidr-blocks 169.254.6.0/29

Output::

    {
        "TransitGatewayConnectPeer": {
            "TransitGatewayAttachmentId": "tgw-attach-0f0927767cEXAMPLE",
            "TransitGatewayConnectPeerId": "tgw-connect-peer-0666adbac4EXAMPLE",
            "State": "pending",
            "CreationTime": "2021-10-13T03:35:17.000Z",
            "ConnectPeerConfiguration": {
                "TransitGatewayAddress": "10.0.0.234",
                "PeerAddress": "172.31.1.11",
                "InsideCidrBlocks": [
                    "169.254.6.0/29"
                ],
                "Protocol": "gre",
                "BgpConfigurations": [
                    {
                        "TransitGatewayAsn": 64512,
                        "PeerAsn": 64512,
                        "TransitGatewayAddress": "169.254.6.2",
                        "PeerAddress": "169.254.6.1",
                        "BgpStatus": "down"
                    },
                    {
                        "TransitGatewayAsn": 64512,
                        "PeerAsn": 64512,
                        "TransitGatewayAddress": "169.254.6.3",
                        "PeerAddress": "169.254.6.1",
                        "BgpStatus": "down"
                    }
                ]
            }
        }
    }

For more information, see `Transit gateway Connect attachments and Transit Gateway Connect peers <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-connect.html>`__ in the *Transit Gateways Guide*.