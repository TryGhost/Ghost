**To get prefix list references in a transit gateway route table**

The following ``get-transit-gateway-prefix-list-references`` example gets the prefix list references for the specified transit gateway route table, and filters by the ID of a specific prefix list. ::

    aws ec2 get-transit-gateway-prefix-list-references \
        --transit-gateway-route-table-id tgw-rtb-0123456789abcd123 \
        --filters Name=prefix-list-id,Values=pl-11111122222222333

Output::

    {
        "TransitGatewayPrefixListReferences": [
            {
                "TransitGatewayRouteTableId": "tgw-rtb-0123456789abcd123",
                "PrefixListId": "pl-11111122222222333",
                "PrefixListOwnerId": "123456789012",
                "State": "available",
                "Blackhole": false,
                "TransitGatewayAttachment": {
                    "TransitGatewayAttachmentId": "tgw-attach-aabbccddaabbccaab",
                    "ResourceType": "vpc",
                    "ResourceId": "vpc-112233445566aabbc"
                }
            }
        ]
    }

For more information, see `Prefix list references <https://docs.aws.amazon.com/vpc/latest/tgw/create-prefix-list-reference.html>`__ in the *Transit Gateways Guide*.
