**To create a transit gateway peering attachment**

The following ``create-transit-gateway-peering-attachment`` example creates a peering attachment request between the two specified transit gateways. ::

    aws ec2 create-transit-gateway-peering-attachment \
        --transit-gateway-id tgw-123abc05e04123abc \
        --peer-transit-gateway-id tgw-11223344aabbcc112 \
        --peer-account-id 123456789012 \
        --peer-region us-east-2

Output::

    {
        "TransitGatewayPeeringAttachment": {
            "TransitGatewayAttachmentId": "tgw-attach-4455667788aabbccd",
            "RequesterTgwInfo": {
                "TransitGatewayId": "tgw-123abc05e04123abc",
                "OwnerId": "123456789012",
                "Region": "us-west-2"
            },
            "AccepterTgwInfo": {
                "TransitGatewayId": "tgw-11223344aabbcc112",
                "OwnerId": "123456789012",
                "Region": "us-east-2"
            },
            "State": "initiatingRequest",
            "CreationTime": "2019-12-09T11:38:05.000Z"
        }
    }

For more information, see `Transit Gateway Peering Attachments <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html>`__ in the *Transit Gateways Guide*.
