**To disable a transit gateway attachment to propagate routes to the specified propagation route table**

The following ``disable-transit-gateway-route-table-propagation`` example disables the specified attachment to propagate routes to the specified propagation route table. ::

    aws ec2 disable-transit-gateway-route-table-propagation \
        --transit-gateway-route-table-id tgw-rtb-0a823edbdeEXAMPLE \
        --transit-gateway-attachment-id tgw-attach-09b52ccdb5EXAMPLE

Output::

    {
        "Propagation": {
            "TransitGatewayAttachmentId": "tgw-attach-09b52ccdb5EXAMPLE",
            "ResourceId": "vpc-4d7de228",
            "ResourceType": "vpc",
            "TransitGatewayRouteTableId": "tgw-rtb-0a823edbdeEXAMPLE",
            "State": "disabled"
        }
    }

For more information, see `Transit gateway route tables <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html>`__ in the *Transit Gateways Guide*.