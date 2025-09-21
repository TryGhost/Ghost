**To create a transit gateway Connect attachment**

The following ``create-transit-gateway-connect`` example creates a Connect attachment, with the "gre" protocol, for the specified attachment. ::

    aws ec2 create-transit-gateway-connect \
        --transport-transit-gateway-attachment-id tgw-attach-0a89069f57EXAMPLE \
        --options "Protocol=gre"

Output::

    {
        "TransitGatewayConnect": {
            "TransitGatewayAttachmentId": "tgw-attach-037012e5dcEXAMPLE",
            "TransportTransitGatewayAttachmentId": "tgw-attach-0a89069f57EXAMPLE",
            "TransitGatewayId": "tgw-02f776b1a7EXAMPLE",
            "State": "pending",
            "CreationTime": "2021-03-09T19:59:17+00:00",
            "Options": {
                "Protocol": "gre"
            }
        }
    }

For more information, see `Transit gateway Connect attachments and Transit Gateway Connect peers <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-connect.html>`__ in the *Transit Gateways Guide*.