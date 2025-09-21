**To describe your transit gateway VPC attachments**

The following ``describe-transit-gateway-vpc-attachments`` example displays details for your transit gateway VPC attachments. ::

    aws ec2 describe-transit-gateway-vpc-attachments

Output::

    {
        "TransitGatewayVpcAttachments": [
            {
                "TransitGatewayAttachmentId": "tgw-attach-0a08e88308EXAMPLE",
                "TransitGatewayId": "tgw-0043d72bb4EXAMPLE",
                "VpcId": "vpc-0f501f7ee8EXAMPLE",
                "VpcOwnerId": "111122223333",
                "State": "available",
                "SubnetIds": [
                    "subnet-045d586432EXAMPLE",
                    "subnet-0a0ad478a6EXAMPLE"
                ],
                "CreationTime": "2019-02-13T11:04:02.000Z",
                "Options": {
                    "DnsSupport": "enable",
                    "Ipv6Support": "disable"
                },
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "attachment name"
                    }
                ]
            }
        ]
    }

For more information, see `View your VPC attachments <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html#view-vpc-attachment>`__ in the *Transit Gateways Guide*.