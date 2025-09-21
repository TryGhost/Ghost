**To get customer-owned IP address pool usage**

The following ``get-coip-pool-usage`` example gets the usage details for the specified customer-owned IP address pool. ::

    aws ec2 get-coip-pool-usage \
        --pool-id ipv4pool-coip-123a45678bEXAMPLE

Output::

    {
        "CoipPoolId": "ipv4pool-coip-123a45678bEXAMPLE",
        "CoipAddressUsages": [
            {
                "CoIp": "0.0.0.0"
            },
            {
                "AllocationId": "eipalloc-123ab45c6dEXAMPLE",
                "AwsAccountId": "123456789012",
                "CoIp": "0.0.0.0"
            },
            {
                "AllocationId": "eipalloc-123ab45c6dEXAMPLE",
                "AwsAccountId": "123456789111",
                "CoIp": "0.0.0.0"
            }
        ],
        "LocalGatewayRouteTableId": "lgw-rtb-059615ef7dEXAMPLE"
    }

For more information, see `Customer-owned IP addresses <https://docs.aws.amazon.com/outposts/latest/userguide/routing.html#ip-addressing>`__ in the *AWS Outposts User Guide for Outposts racks*.
