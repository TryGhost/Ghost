**To delete a pool of customer-owned IP (CoIP) addresses**

The following ``delete-coip-pool`` example deletes a CoIP pool of CoIP addresses. ::

    aws ec2 delete-coip-pool \
        --coip-pool-id ipv4pool-coip-1234567890abcdefg

Output::

    {
        "CoipPool": {
            "PoolId": "ipv4pool-coip-1234567890abcdefg",
            "LocalGatewayRouteTableId": "lgw-rtb-abcdefg1234567890",
            "PoolArn": "arn:aws:ec2:us-west-2:123456789012:coip-pool/ipv4pool-coip-1234567890abcdefg"
        }
    }

For more information, see `Customer-owned IP addresses <https://docs.aws.amazon.com/outposts/latest/userguide/routing.html#ip-addressing>`__ in the *AWS Outposts User Guide*.