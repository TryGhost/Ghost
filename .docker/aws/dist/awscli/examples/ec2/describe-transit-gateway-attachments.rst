**To view your transit gateway attachments**

 The following ``describe-transit-gateway-attachments`` example displays details for your transit gateway attachments. ::

    aws ec2 describe-transit-gateway-attachments

Output::

    {
        "TransitGatewayAttachments": [
            {
                "TransitGatewayAttachmentId": "tgw-attach-01f8100bc7EXAMPLE",
                "TransitGatewayId": "tgw-02f776b1a7EXAMPLE",
                "TransitGatewayOwnerId": "123456789012",
                "ResourceOwnerId": "123456789012",
                "ResourceType": "vpc",
                "ResourceId": "vpc-3EXAMPLE",
                "State": "available",
                "Association": {
                    "TransitGatewayRouteTableId": "tgw-rtb-002573ed1eEXAMPLE",
                    "State": "associated"
                },
                "CreationTime": "2019-08-26T14:59:25.000Z",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "Example"
                    }
                ]
            },
            {
                "TransitGatewayAttachmentId": "tgw-attach-0b5968d3b6EXAMPLE",
                "TransitGatewayId": "tgw-02f776b1a7EXAMPLE",
                "TransitGatewayOwnerId": "123456789012",
                "ResourceOwnerId": "123456789012",
                "ResourceType": "vpc",
                "ResourceId": "vpc-0065acced4EXAMPLE",
                "State": "available",
                "Association": {
                    "TransitGatewayRouteTableId": "tgw-rtb-002573ed1eEXAMPLE",
                    "State": "associated"
                },
                "CreationTime": "2019-08-07T17:03:07.000Z",
                "Tags": []
            },
            {
                "TransitGatewayAttachmentId": "tgw-attach-08e0bc912cEXAMPLE",
                "TransitGatewayId": "tgw-02f776b1a7EXAMPLE",
                "TransitGatewayOwnerId": "123456789012",
                "ResourceOwnerId": "123456789012",
                "ResourceType": "direct-connect-gateway",
                "ResourceId": "11460968-4ac1-4fd3-bdb2-00599EXAMPLE",
                "State": "available",
                "Association": {
                    "TransitGatewayRouteTableId": "tgw-rtb-002573ed1eEXAMPLE",
                    "State": "associated"
                },
                "CreationTime": "2019-08-14T20:27:44.000Z",
                "Tags": []
            },
            {
                "TransitGatewayAttachmentId": "tgw-attach-0a89069f57EXAMPLE",
                "TransitGatewayId": "tgw-02f776b1a7EXAMPLE",
                "TransitGatewayOwnerId": "123456789012",
                "ResourceOwnerId": "123456789012",
                "ResourceType": "direct-connect-gateway",
                "ResourceId": "8384da05-13ce-4a91-aada-5a1baEXAMPLE",
                "State": "available",
                "Association": {
                    "TransitGatewayRouteTableId": "tgw-rtb-002573ed1eEXAMPLE",
                    "State": "associated"
                },
                "CreationTime": "2019-08-14T20:33:02.000Z",
                "Tags": []
            }
        ]
    }

For more information, see `Work with transit gateways <https://docs.aws.amazon.com/vpc/latest/tgw/working-with-transit-gateways.html>`__ in the *Transit Gateways Guide*.