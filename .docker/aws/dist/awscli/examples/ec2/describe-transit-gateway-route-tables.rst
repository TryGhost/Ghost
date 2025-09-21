**To describe your transit gateway route tables**

The following ``describe-transit-gateway-route-tables`` example displays details for your transit gateway route tables. ::

    aws ec2 describe-transit-gateway-route-tables

Output::

    {
        "TransitGatewayRouteTables": [
            {
                "TransitGatewayRouteTableId": "tgw-rtb-0ca78a549EXAMPLE",
                "TransitGatewayId": "tgw-0bc994abffEXAMPLE",
                "State": "available",
                "DefaultAssociationRouteTable": true,
                "DefaultPropagationRouteTable": true,
                "CreationTime": "2018-11-28T14:24:49.000Z",
                "Tags": []
            },
            {
                "TransitGatewayRouteTableId": "tgw-rtb-0e8f48f148EXAMPLE",
                "TransitGatewayId": "tgw-0043d72bb4EXAMPLE",
                "State": "available",
                "DefaultAssociationRouteTable": true,
                "DefaultPropagationRouteTable": true,
                "CreationTime": "2018-11-28T14:24:00.000Z",
                "Tags": []
            }
        ]
    }

For more information, see `View transit gateway route tables <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html#view-tgw-route-tables>`__ in the *Transit Gateways Guide*.