**To create a static route for a local gateway route table**

The following ``create-local-gateway-route`` example creates the specified route in the specified local gateway route table. ::

    aws ec2 create-local-gateway-route \
        --destination-cidr-block 0.0.0.0/0 \
        --local-gateway-route-table-id lgw-rtb-059615ef7dEXAMPLE

Output::

    {
        "Route": {
            "DestinationCidrBlock": "0.0.0.0/0",
            "LocalGatewayVirtualInterfaceGroupId": "lgw-vif-grp-07145b276bEXAMPLE",
            "Type": "static",
            "State": "deleted",
            "LocalGatewayRouteTableId": "lgw-rtb-059615ef7dEXAMPLE"
        }
    }
