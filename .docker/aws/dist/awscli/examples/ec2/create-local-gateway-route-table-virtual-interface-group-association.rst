**To associate a local gateway route table with a virtual interfaces (VIFs) group**

The following ``create-local-gateway-route-table-virtual-interface-group-association`` example creates an association between the specified local gateway route table and VIF group. ::

    aws ec2 create-local-gateway-route-table-virtual-interface-group-association \
        --local-gateway-route-table-id lgw-rtb-exampleidabcd1234 \
        --local-gateway-virtual-interface-group-id lgw-vif-grp-exampleid0123abcd

Output::

    {
        "LocalGatewayRouteTableVirtualInterfaceGroupAssociation": {
            "LocalGatewayRouteTableVirtualInterfaceGroupAssociationId": "lgw-vif-grp-assoc-exampleid12345678",
            "LocalGatewayVirtualInterfaceGroupId": "lgw-vif-grp-exampleid0123abcd",
            "LocalGatewayId": "lgw-exampleid11223344",
            "LocalGatewayRouteTableId": "lgw-rtb-exampleidabcd1234",
            "LocalGatewayRouteTableArn": "arn:aws:ec2:us-west-2:111122223333:local-gateway-route-table/lgw-rtb-exampleidabcd1234",
            "OwnerId": "111122223333",
            "State": "pending",
            "Tags": []
        }
    }

For more information, see `VIF group associations <https://docs.aws.amazon.com/outposts/latest/userguide/routing.html#vif-group-associations>`__ in the *AWS Outposts User Guide*.