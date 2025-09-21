**To associate a VPC with a route table**

The following ``create-local-gateway-route-table-vpc-association`` example associates the specified VPC with the specified local gateway route table. ::

    aws ec2 create-local-gateway-route-table-vpc-association \
        --local-gateway-route-table-id lgw-rtb-059615ef7dEXAMPLE \
        --vpc-id vpc-07ef66ac71EXAMPLE

Output::

    {
        "LocalGatewayRouteTableVpcAssociation": {
            "LocalGatewayRouteTableVpcAssociationId": "lgw-vpc-assoc-0ee765bcc8EXAMPLE",
            "LocalGatewayRouteTableId": "lgw-rtb-059615ef7dEXAMPLE",
            "LocalGatewayId": "lgw-09b493aa7cEXAMPLE",
            "VpcId": "vpc-07ef66ac71EXAMPLE",
            "State": "associated"
        }
    }
