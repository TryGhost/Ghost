**To view the information about the transit gateway multicast domain associations**

The following ``get-transit-gateway-multicast-domain-associations`` example returns the associations for the specified multicast domain. ::

    aws ec2 get-transit-gateway-multicast-domain-associations \
        --transit-gateway-multicast-domain-id tgw-mcast-domain-0c4905cef7EXAMPLE

Output::

    {
        "MulticastDomainAssociations": [
            {
                "TransitGatewayAttachmentId": "tgw-attach-028c1dd0f8EXAMPLE",
                "ResourceId": "vpc-01128d2c24EXAMPLE",
                "ResourceType": "vpc",
                "Subnet": {
                    "SubnetId": "subnet-000de86e3bEXAMPLE",
                    "State": "associated"
                }
            },
            {
                "TransitGatewayAttachmentId": "tgw-attach-070e571cd1EXAMPLE",
                "ResourceId": "vpc-7EXAMPLE",
                "ResourceType": "vpc",
                "Subnet": {
                    "SubnetId": "subnet-4EXAMPLE",
                    "State": "associated"
                }
            },
            {
                "TransitGatewayAttachmentId": "tgw-attach-070e571cd1EXAMPLE",
                "ResourceId": "vpc-7EXAMPLE",
                "ResourceType": "vpc",
                "Subnet": {
                    "SubnetId": "subnet-5EXAMPLE",
                    "State": "associated"
                }
            },
            {
                "TransitGatewayAttachmentId": "tgw-attach-070e571cd1EXAMPLE",
                "ResourceId": "vpc-7EXAMPLE",
                "ResourceType": "vpc",
                "Subnet": {
                    "SubnetId": "subnet-aEXAMPLE",
                    "State": "associated"
                }
            },
            {
                "TransitGatewayAttachmentId": "tgw-attach-070e571cd1EXAMPLE",
                "ResourceId": "vpc-7EXAMPLE",
                "ResourceType": "vpc",
                "Subnet": {
                    "SubnetId": "subnet-fEXAMPLE",
                    "State": "associated"
                }
            }
        ]
    }

For more information, see `Multicast domains <https://docs.aws.amazon.com/vpc/latest/tgw/multicast-domains-about.html>`__ in the *Transit Gateways Guide*.
