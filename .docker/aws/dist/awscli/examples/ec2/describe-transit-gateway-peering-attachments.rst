**To describe your transit gateway peering attachments**

The following ``describe-transit-gateway-peering-attachments`` example displays details for all of your transit gateway peering attachments. ::

    aws ec2 describe-transit-gateway-peering-attachments

Output::

  {
      "TransitGatewayPeeringAttachments": [
          {
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
              "State": "pendingAcceptance",
              "CreationTime": "2019-12-09T11:38:05.000Z",
              "Tags": []
          }
      ]
  }

For more information, see `Transit Gateway Peering Attachments <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html>`__ in the *Transit Gateways Guide*.
