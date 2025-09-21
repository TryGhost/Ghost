**To delete a route from a local gateway route table**

The following ``delete-local-gateway-route`` example deletes the specified route from the specified local gateway route table. ::

    aws ec2 delete-local-gateway-route \
        --destination-cidr-block 0.0.0.0/0 \
        --local-gateway-route-table-id lgw-rtb-059615ef7dEXAMPLE

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
