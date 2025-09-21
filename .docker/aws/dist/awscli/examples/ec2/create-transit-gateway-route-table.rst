**To create a Transit Gateway Route Table**

The following ``create-transit-gateway-route-table`` example creates a route table for the specified transit gateway. ::

    aws ec2 create-transit-gateway-route-table \
        --transit-gateway-id tgw-0262a0e521EXAMPLE

Output::

    {
        "TransitGatewayRouteTable": {
            "TransitGatewayRouteTableId": "tgw-rtb-0960981be7EXAMPLE",
            "TransitGatewayId": "tgw-0262a0e521EXAMPLE",
            "State": "pending",
            "DefaultAssociationRouteTable": false,
            "DefaultPropagationRouteTable": false,
            "CreationTime": "2019-07-10T19:01:46.000Z"
        }
    }

For more information, see `Create a transit gateway route table <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html#create-tgw-route-table>`__ in the *Transit Gateways Guide*.