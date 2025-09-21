**To associate a transit gateway with a multicast domain**

The following ``associate-transit-gateway-multicast-domain`` example associates the specified subnet and attachment with the specified multicast domain. ::

    aws ec2 associate-transit-gateway-multicast-domain \
        --transit-gateway-multicast-domain-id tgw-mcast-domain-0c4905cef79d6e597 \
        --transit-gateway-attachment-id tgw-attach-028c1dd0f8f5cbe8e \
        --subnet-ids subnet-000de86e3b49c932a \
        --transit-gateway-multicast-domain-id tgw-mcast-domain-0c4905cef7EXAMPLE

Output::

    {
        "Associations": {
            "TransitGatewayMulticastDomainId": "tgw-mcast-domain-0c4905cef79d6e597",
            "TransitGatewayAttachmentId": "tgw-attach-028c1dd0f8f5cbe8e",
            "ResourceId": "vpc-01128d2c240c09bd5",
            "ResourceType": "vpc",
            "Subnets": [
                {
                    "SubnetId": "subnet-000de86e3b49c932a",
                    "State": "associating"
                }
            ]
        }
    }

For more information, see `Multicast domains <https://docs.aws.amazon.com/vpc/latest/tgw/multicast-domains-about.html>`__ in the *Transit Gateways Guide*.
