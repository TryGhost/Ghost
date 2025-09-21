**To describe your Local Gateways**

The following ``describe-local-gateways`` example displays details for the local gateways that are available to you. ::

    aws ec2 describe-local-gateways

Output::

    {
        "LocalGateways": [
            {
                "LocalGatewayId": "lgw-09b493aa7cEXAMPLE",
                "OutpostArn": "arn:aws:outposts:us-west-2:123456789012:outpost/op-0dc11b66ed59f995a",
                "OwnerId": "123456789012",
                "State": "available"
            }
        ]
    }
