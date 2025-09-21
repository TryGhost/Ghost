**Example 1: To create an IGMP multicast domain**

The following ``create-transit-gateway-multicast-domain`` example creates a multicast domain for the specified transit gateway. With static sources disabled, any instances in subnets associated with the multicast domain can send multicast traffic. If at least one member uses the IGMP protocol, you must enable IGMPv2 support. ::

    aws ec2 create-transit-gateway-multicast-domain \
        --transit-gateway-id tgw-0bf0bffefaEXAMPLE \
        --options StaticSourcesSupport=disable,Igmpv2Support=enable

Output::

    {
        "TransitGatewayMulticastDomain": {
            "TransitGatewayMulticastDomainId": "tgw-mcast-domain-0c9e29e2a7EXAMPLE",
            "TransitGatewayId": "tgw-0bf0bffefaEXAMPLE",
            "TransitGatewayMulticastDomainArn": "arn:aws:ec2:us-west-2:123456789012:transit-gateway-multicast-domain/tgw-mcast-domain-0c9e29e2a7EXAMPLE",
            "OwnerId": "123456789012",
            "Options": {
                "Igmpv2Support": "enable",
                "StaticSourcesSupport": "disable",
                "AutoAcceptSharedAssociations": "disable"
            },
            "State": "pending",
            "CreationTime": "2021-09-29T22:17:13.000Z"
        }
    }

**Example 2: To create a static multicast domain**

The following ``create-transit-gateway-multicast-domain`` example creates a multicast domain for the specified transit gateway. With static sources enabled, you must statically add sources. ::

    aws ec2 create-transit-gateway-multicast-domain \
        --transit-gateway-id tgw-0bf0bffefaEXAMPLE \
        --options StaticSourcesSupport=enable,Igmpv2Support=disable

Output::

    {
        "TransitGatewayMulticastDomain": {
            "TransitGatewayMulticastDomainId": "tgw-mcast-domain-000fb24d04EXAMPLE",
            "TransitGatewayId": "tgw-0bf0bffefaEXAMPLE",
            "TransitGatewayMulticastDomainArn": "arn:aws:ec2:us-west-2:123456789012:transit-gateway-multicast-domain/tgw-mcast-domain-000fb24d04EXAMPLE",
            "OwnerId": "123456789012",
            "Options": {
                "Igmpv2Support": "disable",
                "StaticSourcesSupport": "enable",
                "AutoAcceptSharedAssociations": "disable"
            },
            "State": "pending",
            "CreationTime": "2021-09-29T22:20:19.000Z"
        }
    }

For more information, see `Managing multicast domains <https://docs.aws.amazon.com/vpc/latest/tgw/manage-domain.html>`__ in the *Transit Gateways Guide*.