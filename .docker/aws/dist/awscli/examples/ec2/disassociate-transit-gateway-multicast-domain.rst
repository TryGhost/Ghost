**To disassociate subnets from a multicast domain**

The following ``disassociate-transit-gateway-multicast-domain`` example disassociates a subnet from the specified multicast domain. ::

    aws ec2 disassociate-transit-gateway-multicast-domain \
        --transit-gateway-attachment-id tgw-attach-070e571cd1EXAMPLE \
        --subnet-id subnet-000de86e3bEXAMPLE \
        --transit-gateway-multicast-domain-id tgw-mcast-domain-0c4905cef7EXAMPLE

Output::

    {
        "Associations": {
            "TransitGatewayMulticastDomainId": "tgw-mcast-domain-0c4905cef7EXAMPLE",
            "TransitGatewayAttachmentId": "tgw-attach-070e571cd1EXAMPLE",
            "ResourceId": "vpc-7EXAMPLE",
            "ResourceType": "vpc",
            "Subnets": [
                {
                    "SubnetId": "subnet-000de86e3bEXAMPLE",
                    "State": "disassociating"
                }
            ]
        }
    }

For more information, see `Multicast domains <https://docs.aws.amazon.com/vpc/latest/tgw/multicast-domains-about.html>`__ in the *Transit Gateways Guide*'.
