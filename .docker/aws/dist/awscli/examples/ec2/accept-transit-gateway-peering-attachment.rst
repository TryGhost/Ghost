**To accept a transit gateway peering attachment**

The following ``accept-transit-gateway-peering-attachment`` example accepts the specified transit gateway peering attachment. The ``--region`` parameter specifies the Region that the accepter transit gateway is located in. ::

    aws ec2 accept-transit-gateway-peering-attachment \
        --transit-gateway-attachment-id tgw-attach-4455667788aabbccd \
        --region us-east-2

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
            "State": "pending",
            "CreationTime": "2019-12-09T11:38:31.000Z"
        }
    }

For more information, see `Transit Gateway Peering Attachments <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html>`__ in the *Transit Gateways Guide*.
