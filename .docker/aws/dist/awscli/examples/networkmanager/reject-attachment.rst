**To reject an attachment**

The following ``reject-attachment`` example rejects a VPC attachment request. ::

    aws networkmanager reject-attachment \
        --attachment-id  attachment-03b7ea450134787da 

Output::

    {
        "Attachment": {
            "CoreNetworkId": "core-network-0522de1b226a5d7b3",
            "AttachmentId": "attachment-03b7ea450134787da",
            "OwnerAccountId": "987654321012",
            "AttachmentType": "VPC",
            "State": "AVAILABLE",
            "EdgeLocation": "us-east-1",
            "ResourceArn": "arn:aws:ec2:us-east-1:987654321012:vpc/vpc-a7c4bbda",
            "CreatedAt": "2022-03-11T17:48:58+00:00",
            "UpdatedAt": "2022-03-11T17:51:25+00:00"
        }
    }

For more information, see `Attachment acceptance <https://docs.aws.amazon.com/vpc/latest/cloudwan/cloudwan-attachments-working-with.html#cloudwan-attachments-acceptance>`__ in the *Cloud WAN User Guide*.