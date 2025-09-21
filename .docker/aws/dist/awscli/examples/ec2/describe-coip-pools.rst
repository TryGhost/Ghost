**To describe customer-owned IP address pools**

The following ``describe-coip-pools`` example describes the customer-owned IP address pools in your AWS account. ::

    aws ec2 describe-coip-pools

Output::

    {
        "CoipPools": [
            {
                "PoolId": "ipv4pool-coip-123a45678bEXAMPLE",
                "PoolCidrs": [
                    "0.0.0.0/0"
                ],
                "LocalGatewayRouteTableId": "lgw-rtb-059615ef7dEXAMPLE",
                "PoolArn": "arn:aws:ec2:us-west-2:123456789012:coip-pool/ipv4pool-coip-123a45678bEXAMPLE"
            }
        ]
    }

For more information, see `Customer-owned IP addresses <https://docs.aws.amazon.com/outposts/latest/userguide/outposts-networking-components.html#ip-addressing>`__ in the *AWS Outposts User Guide*.
