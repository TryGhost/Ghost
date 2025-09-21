**To create a local gateway route table**

The following ``create-local-gateway-route-table`` example creates a local gateway route table with the direct VPC routing mode. ::

    aws ec2 create-local-gateway-route-table \
        --local-gateway-id lgw-1a2b3c4d5e6f7g8h9 \
        --mode direct-vpc-routing

Output::

    {
        "LocalGatewayRouteTable": {
            "LocalGatewayRouteTableId": "lgw-rtb-abcdefg1234567890",
            "LocalGatewayRouteTableArn": "arn:aws:ec2:us-west-2:111122223333:local-gateway-route-table/lgw-rtb-abcdefg1234567890",
            "LocalGatewayId": "lgw-1a2b3c4d5e6f7g8h9",
            "OutpostArn": "arn:aws:outposts:us-west-2:111122223333:outpost/op-021345abcdef67890",
            "OwnerId": "111122223333",
            "State": "pending",
            "Tags": [],
            "Mode": "direct-vpc-routing"
        }
    }

For more information, see `Local gateway route tables <https://docs.aws.amazon.com/outposts/latest/userguide/routing.html>`__ in the *AWS Outposts User Guide*.