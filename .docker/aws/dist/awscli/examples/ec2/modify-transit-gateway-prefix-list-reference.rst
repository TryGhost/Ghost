**To modify a reference to a prefix list**

The following ``modify-transit-gateway-prefix-list-reference`` example modifies the prefix list reference in the specified route table by changing the attachment to which traffic is routed. ::

    aws ec2 modify-transit-gateway-prefix-list-reference \
        --transit-gateway-route-table-id tgw-rtb-0123456789abcd123 \
        --prefix-list-id pl-11111122222222333 \
        --transit-gateway-attachment-id tgw-attach-aabbccddaabbccaab

Output::

    {
        "TransitGatewayPrefixListReference": {
            "TransitGatewayRouteTableId": "tgw-rtb-0123456789abcd123",
            "PrefixListId": "pl-11111122222222333",
            "PrefixListOwnerId": "123456789012",
            "State": "modifying",
            "Blackhole": false,
            "TransitGatewayAttachment": {
                "TransitGatewayAttachmentId": "tgw-attach-aabbccddaabbccaab",
                "ResourceType": "vpc",
                "ResourceId": "vpc-112233445566aabbc"
            }
        }
    }

For more information, see `Prefix list references <https://docs.aws.amazon.com/vpc/latest/tgw/create-prefix-list-reference.html>`__ in the *Transit Gateways Guide*.
