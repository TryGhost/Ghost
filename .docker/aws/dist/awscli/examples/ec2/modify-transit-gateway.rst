**To modify a transit gateway**

The following ``modify-transit-gateway`` example modifies the specified transit gateway by enabling ECMP support for VPN attachments. ::

    aws ec2 modify-transit-gateway \
        --transit-gateway-id tgw-111111222222aaaaa \
        --options VpnEcmpSupport=enable

Output::

    {
        "TransitGateway": {
            "TransitGatewayId": "tgw-111111222222aaaaa",
            "TransitGatewayArn": "64512",
            "State": "modifying",
            "OwnerId": "123456789012",
            "CreationTime": "2020-04-30T08:41:37.000Z",
            "Options": {
                "AmazonSideAsn": 64512,
                "AutoAcceptSharedAttachments": "disable",
                "DefaultRouteTableAssociation": "enable",
                "AssociationDefaultRouteTableId": "tgw-rtb-0123456789abcd123",
                "DefaultRouteTablePropagation": "enable",
                "PropagationDefaultRouteTableId": "tgw-rtb-0123456789abcd123",
                "VpnEcmpSupport": "enable",
                "DnsSupport": "enable"
            }
        }
    }

For more information, see `Transit gateways <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-transit-gateways.html>`__ in the *Transit Gateways Guide*.
