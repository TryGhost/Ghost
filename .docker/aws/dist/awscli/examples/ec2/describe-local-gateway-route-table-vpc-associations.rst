**To describe the associations between VPCs and local gateway route tables**

The following ``describe-local-gateway-route-table-vpc-associations`` example displays information about the specified association between VPCs and local gateway route tables. ::

    aws ec2 describe-local-gateway-route-table-vpc-associations \
        --local-gateway-route-table-vpc-association-ids lgw-vpc-assoc-0e0f27af15EXAMPLE

Output::

    {
        "LocalGatewayRouteTableVpcAssociation": {
            "LocalGatewayRouteTableVpcAssociationId": "lgw-vpc-assoc-0e0f27af1EXAMPLE",
            "LocalGatewayRouteTableId": "lgw-rtb-059615ef7dEXAMPLE",
            "LocalGatewayId": "lgw-09b493aa7cEXAMPLE",
            "VpcId": "vpc-0efe9bde08EXAMPLE",
            "State": "associated"
        }
    }

For more information, see `Local gateway route tables <https://docs.aws.amazon.com/outposts/latest/userguide/routing.html>`__ in the *Outposts User Guide*.
