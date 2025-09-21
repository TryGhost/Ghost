**To create a VPC attachment**

The following ``create-vpc-attachment`` example creates a VPC attachment with IPv6 support in a core network. ::

    aws networkmanager create-vpc-attachment \
        --core-network-id core-network-0fab62fe438d94db6 \
        --vpc-arn arn:aws:ec2:us-east-1:987654321012:vpc/vpc-09f37f69e2786eeb8  \
        --subnet-arns arn:aws:ec2:us-east-1:987654321012:subnet/subnet-04ca4e010857e7bb7 \
        --Ipv6Support=true 

Output::

    {
        "VpcAttachment": {
            "Attachment": {
                "CoreNetworkId": "core-network-0fab62fe438d94db6",
                "AttachmentId": "attachment-05e1da6eba87a06e6",
                "OwnerAccountId": "987654321012",
                "AttachmentType": "VPC",
                "State": "CREATING",
                "EdgeLocation": "us-east-1",
                "ResourceArn": "arn:aws:ec2:us-east-1:987654321012:vpc/vpc-09f37f69e2786eeb8",
                "Tags": [],
                "CreatedAt": "2022-03-10T20:59:14+00:00",
                "UpdatedAt": "2022-03-10T20:59:14+00:00"
            },
            "SubnetArns": [
                "arn:aws:ec2:us-east-1:987654321012:subnet/subnet-04ca4e010857e7bb7"
            ],
            "Options": {
                "Ipv6Support": true
            }
        }
    }

For more information, see `Create an attachment <https://docs.aws.amazon.com/vpc/latest/cloudwan/cloudwan-create-attachment.html>`__ in the *Cloud WAN User Guide*.