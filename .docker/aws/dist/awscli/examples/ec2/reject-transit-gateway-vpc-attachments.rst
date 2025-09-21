**To reject a transit gateway VPC attachment**

The following ``reject-transit-gateway-vpc-attachment`` example rejects the specified transit gateway VPC attachment. ::

    aws ec2 reject-transit-gateway-vpc-attachment \
        --transit-gateway-attachment-id tgw-attach-0a34fe6b4fEXAMPLE

Output::

    {
        "TransitGatewayVpcAttachment": {
            "TransitGatewayAttachmentId": "tgw-attach-0a34fe6b4fEXAMPLE",
            "TransitGatewayId": "tgw-0262a0e521EXAMPLE",
            "VpcId": "vpc-07e8ffd50fEXAMPLE",
            "VpcOwnerId": "111122223333",
            "State": "pending",
            "SubnetIds": [
                "subnet-0752213d59EXAMPLE"
            ],
            "CreationTime": "2019-07-10T17:33:46.000Z",
            "Options": {
                "DnsSupport": "enable",
                "Ipv6Support": "disable"
            }
        }
    }

For more information, see `Transit gateway attachments to a VPC <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html>`__ in the *Transit Gateways Guide*.