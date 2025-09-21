**To describe associations between virtual interface groups and local gateway route tables**

The following ``describe-local-gateway-route-table-virtual-interface-group-associations`` example describes the associations between virtual interface groups and local gateway route tables in your AWS account. ::

    aws ec2 describe-local-gateway-route-table-virtual-interface-group-associations

Output::

    {
        "LocalGatewayRouteTableVirtualInterfaceGroupAssociations": [
            {
                "LocalGatewayRouteTableVirtualInterfaceGroupAssociationId": "lgw-vif-grp-assoc-07145b276bEXAMPLE",
                "LocalGatewayVirtualInterfaceGroupId": "lgw-vif-grp-07145b276bEXAMPLE",
                "LocalGatewayId": "lgw-0ab1c23d4eEXAMPLE",
                "LocalGatewayRouteTableId": "lgw-rtb-059615ef7dEXAMPLE",
                "LocalGatewayRouteTableArn": "arn:aws:ec2:us-west-2:123456789012:local-gateway-route-table/lgw-rtb-059615ef7dEXAMPLE",
                "OwnerId": "123456789012",
                "State": "associated",
                "Tags": []
            }
        ]
    }

For more information, see `Working with local gateways <https://docs.aws.amazon.com/outposts/latest/userguide/outposts-local-gateways.html>`__ in the *AWS Outposts User Guide*.
