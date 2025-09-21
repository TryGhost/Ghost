**To create a pool of customer-owned IP (CoIP) addresses**

The following ``create-coip-pool`` example creates a CoIP pool for CoIP addresses in the specified local gateway route table. ::

    aws ec2 create-coip-pool \
        --local-gateway-route-table-id lgw-rtb-abcdefg1234567890

Output::

    {
        "CoipPool": {
            "PoolId": "ipv4pool-coip-1234567890abcdefg",
            "LocalGatewayRouteTableId": "lgw-rtb-abcdefg1234567890",
            "PoolArn": "arn:aws:ec2:us-west-2:123456789012:coip-pool/ipv4pool-coip-1234567890abcdefg"
        }
    }

For more information, see `Customer-owned IP addresses <https://docs.aws.amazon.com/outposts/latest/userguide/routing.html#ip-addressing>`__ in the *AWS Outposts User Guide*.