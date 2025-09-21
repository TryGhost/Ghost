**To delete a transit gateway route table**

The following ``delete-transit-gateway-route-table`` example deletes the specified transit gateway route table. ::

    aws ec2  delete-transit-gateway-route-table \
        --transit-gateway-route-table-id tgw-rtb-0b6f6aaa01EXAMPLE

Output::

    {
        "TransitGatewayRouteTable": {
            "TransitGatewayRouteTableId": "tgw-rtb-0b6f6aaa01EXAMPLE",
            "TransitGatewayId": "tgw-02f776b1a7EXAMPLE",
            "State": "deleting",
            "DefaultAssociationRouteTable": false,
            "DefaultPropagationRouteTable": false,
            "CreationTime": "2019-07-17T20:27:26.000Z"
        }
    }

For more information, see `Delete a transit gateway route table <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html#delete-tgw-route-table>`__ in the *Transit Gateways Guide*.