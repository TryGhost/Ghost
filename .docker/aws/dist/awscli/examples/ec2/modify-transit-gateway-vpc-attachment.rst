**To modify a transit gateway VPC attachment**

The following ``modify-transit-gateway-vpc-attachment`` example adds a subnet to the specified transit gateway VPC attachment. ::

    aws ec2 modify-transit-gateway-vpc-attachment \
        --transit-gateway-attachment-id tgw-attach-09fbd47ddfEXAMPLE \
        --add-subnet-ids subnet-0e51f45802EXAMPLE

Output::

    {
        "TransitGatewayVpcAttachment": {
            "TransitGatewayAttachmentId": "tgw-attach-09fbd47ddfEXAMPLE",
            "TransitGatewayId": "tgw-0560315ccfEXAMPLE",
            "VpcId": "vpc-5eccc927",
            "VpcOwnerId": "111122223333",
            "State": "modifying",
            "SubnetIds": [
                "subnet-0e51f45802EXAMPLE",
                "subnet-1EXAMPLE"
            ],
            "CreationTime": "2019-08-08T16:47:38.000Z",
            "Options": {
                "DnsSupport": "enable",
                "Ipv6Support": "disable"
            }
        }
    } 

For more information, see `Transit gateway attachments to a VPC <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html>`__ in the *Transit Gateways Guide*.