**To describe a transit gateway Connect attachment**

The following ``describe-transit-gateway-connects`` example describes the specified Connect attachment. ::

    aws ec2 describe-transit-gateway-connects \
        --transit-gateway-attachment-ids tgw-attach-037012e5dcEXAMPLE

Output::

    {
        "TransitGatewayConnects": [
            {
                "TransitGatewayAttachmentId": "tgw-attach-037012e5dcEXAMPLE",
                "TransportTransitGatewayAttachmentId": "tgw-attach-0a89069f57EXAMPLE",
                "TransitGatewayId": "tgw-02f776b1a7EXAMPLE",
                "State": "available",
                "CreationTime": "2021-03-09T19:59:17+00:00",
                "Options": {
                    "Protocol": "gre"
                },
                "Tags": []
            }
        ]
    }

For more information, see `Transit gateway Connect attachments and Transit Gateway Connect peers <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-connect.html>`__ in the *Transit Gateways Guide*.