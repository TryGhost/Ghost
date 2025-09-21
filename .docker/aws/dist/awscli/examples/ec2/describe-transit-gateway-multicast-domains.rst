**To describe your transit gateway multicast domains**

The following ``describe-transit-gateway-multicast-domains`` example displays details for all of your transit gateway multicast domains. ::

    aws ec2 describe-transit-gateway-multicast-domains

Output::

    {
   
        "TransitGatewayMulticastDomains": [
            {
                "TransitGatewayMulticastDomainId": "tgw-mcast-domain-000fb24d04EXAMPLE",
                "TransitGatewayId": "tgw-0bf0bffefaEXAMPLE",
                "TransitGatewayMulticastDomainArn": "arn:aws:ec2:us-east-1:123456789012:transit-gateway-multicast-domain/tgw-mcast-domain-000fb24d04EXAMPLE",
                "OwnerId": "123456789012",
                "Options": {
                    "Igmpv2Support": "disable",
                    "StaticSourcesSupport": "enable",
                    "AutoAcceptSharedAssociations": "disable"
                },
                "State": "available",
                "CreationTime": "2019-12-10T18:32:50+00:00",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "mc1"
                    }
                ]
            }
        ]
    }

For more information, see `Managing multicast domains <https://docs.aws.amazon.com/vpc/latest/tgw/manage-domain.html>`__ in the *Transit Gateways Guide*.