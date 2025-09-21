**To describe local gateway virtual interface groups**

The following ``describe-local-gateway-virtual-interface-groups`` example describes the local gateway virtual interface groups in your AWS account. ::

    aws ec2 describe-local-gateway-virtual-interface-groups

Output::

    {
        "LocalGatewayVirtualInterfaceGroups": [
            {
                "LocalGatewayVirtualInterfaceGroupId": "lgw-vif-grp-07145b276bEXAMPLE",
                "LocalGatewayVirtualInterfaceIds": [
                    "lgw-vif-01a23bc4d5EXAMPLE",
                    "lgw-vif-543ab21012EXAMPLE"
                ],
                "LocalGatewayId": "lgw-0ab1c23d4eEXAMPLE",
                "OwnerId": "123456789012",
                "Tags": []
            }
        ]
    }

For more information, see `Working with local gateways <https://docs.aws.amazon.com/outposts/latest/userguide/outposts-local-gateways.html>`__ in the *AWS Outposts User Guide*.
