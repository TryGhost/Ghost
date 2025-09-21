**To search for routes in a local gateway route table**

The following ``search-local-gateway-routes`` example searches for static routes in the specified local gateway route table. ::

    aws ec2 search-local-gateway-routes \
        --local-gateway-route-table-id lgw-rtb-059615ef7dEXAMPLE \
        --filters "Name=type,Values=static"

Output::

    {
        "Route": {
            "DestinationCidrBlock": "0.0.0.0/0",
            "LocalGatewayVirtualInterfaceGroupId": "lgw-vif-grp-07145b276bEXAMPLE",
            "Type": "static",
            "State": "deleted",
            "LocalGatewayRouteTableId": "lgw-rtb-059615ef7EXAMPLE"
        }
    }