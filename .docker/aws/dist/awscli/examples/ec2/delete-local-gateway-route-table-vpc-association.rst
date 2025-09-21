**To disassociate a local gateway route table from a VPC**

The following ``delete-local-gateway-route-table-vpc-association`` example deletes the association between the specified local gateway route table and VPC. ::

    aws ec2 delete-local-gateway-route-table-vpc-association \
        --local-gateway-route-table-vpc-association-id vpc-example0123456789

Output::

    {
        "LocalGatewayRouteTableVpcAssociation": {
            "LocalGatewayRouteTableVpcAssociationId": "lgw-vpc-assoc-abcd1234wxyz56789",
            "LocalGatewayRouteTableId": "lgw-rtb-abcdefg1234567890",
            "LocalGatewayRouteTableArn": "arn:aws:ec2:us-west-2:555555555555:local-gateway-route-table/lgw-rtb-abcdefg1234567890",
            "LocalGatewayId": "lgw-exampleid01234567",
            "VpcId": "vpc-example0123456789",
            "OwnerId": "555555555555",
            "State": "disassociating"
        }
    }

For more information, see `VPC associations <https://docs.aws.amazon.com/outposts/latest/userguide/routing.html#vpc-associations>`__ in the *AWS Outposts User Guide*.