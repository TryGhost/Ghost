**To delete a transit gateway**

The following ``delete-transit-gateway`` example deletes the specified transit gateway. ::

    aws ec2  delete-transit-gateway \
        --transit-gateway-id tgw-01f04542b2EXAMPLE

Output::

    {
        "TransitGateway": {
            "TransitGatewayId": "tgw-01f04542b2EXAMPLE",
            "State": "deleting",
            "OwnerId": "123456789012",
            "Description": "Example Transit Gateway",
            "CreationTime": "2019-08-27T15:04:35.000Z",
            "Options": {
                "AmazonSideAsn": 64515,
                "AutoAcceptSharedAttachments": "disable",
                "DefaultRouteTableAssociation": "enable",
                "AssociationDefaultRouteTableId": "tgw-rtb-0ce7a6948fEXAMPLE",
                "DefaultRouteTablePropagation": "enable",
                "PropagationDefaultRouteTableId": "tgw-rtb-0ce7a6948fEXAMPLE",
                "VpnEcmpSupport": "enable",
                "DnsSupport": "enable"
            }
        }
    }

For more information, see `Delete a transit gateway <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-transit-gateways.html#delete-tgw>`__ in the *Transit Gateways Guide*.