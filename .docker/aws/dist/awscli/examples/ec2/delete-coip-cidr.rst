**To delete a range of customer-owned IP (CoIP) addresses**

The following ``delete-coip-cidr`` example deletes the specified range of CoIP addresses in the  specified CoIP pool. ::

    aws ec2 delete-coip-cidr \
        --cidr 14.0.0.0/24 \
        --coip-pool-id ipv4pool-coip-1234567890abcdefg

Output::

    {
        "CoipCidr": {
            "Cidr": "14.0.0.0/24",
            "CoipPoolId": "ipv4pool-coip-1234567890abcdefg",
            "LocalGatewayRouteTableId": "lgw-rtb-abcdefg1234567890"
        }
    }

For more information, see `Customer-owned IP addresses <https://docs.aws.amazon.com/outposts/latest/userguide/routing.html#ip-addressing>`__ in the *AWS Outposts User Guide*.