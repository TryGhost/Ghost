**To delete a transit gateway Connect attachment**

The following ``delete-transit-gateway-connect`` example deletes the specified Connect attachment. ::

    aws ec2 delete-transit-gateway-connect \
        --transit-gateway-attachment-id tgw-attach-037012e5dcEXAMPLE

Output::

    {
        "TransitGatewayConnect": {
            "TransitGatewayAttachmentId": "tgw-attach-037012e5dcEXAMPLE",
            "TransportTransitGatewayAttachmentId": "tgw-attach-0a89069f57EXAMPLE",
            "TransitGatewayId": "tgw-02f776b1a7EXAMPLE",
            "State": "deleting",
            "CreationTime": "2021-03-09T19:59:17+00:00",
            "Options": {
                "Protocol": "gre"
            }
        }
    }

For more information, see `Transit gateway Connect attachments and Transit Gateway Connect peers <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-connect.html>`__ in the *Transit Gateways Guide*.