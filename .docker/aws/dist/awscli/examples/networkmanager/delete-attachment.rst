**To delete an attachment**

The following ``delete-attachment`` example deletes a Connect attachment. ::

    aws networkmanager delete-attachment \
        --attachment-id attachment-01feddaeae26ab68c

Output::

    {
        "Attachment": {
            "CoreNetworkId": "core-network-0f4b0a9d5ee7761d1",
            "AttachmentId": "attachment-01feddaeae26ab68c",
            "OwnerAccountId": "987654321012",
            "AttachmentType": "CONNECT",
            "State": "DELETING",
            "EdgeLocation": "us-east-1",
            "ResourceArn": "arn:aws:networkmanager::987654321012:attachment/attachment-02c3964448fedf5aa",
            "CreatedAt": "2022-03-15T19:18:41+00:00",
            "UpdatedAt": "2022-03-15T19:28:59+00:00"
        }
    }

For more information, see `Delete attachments <https://docs.aws.amazon.com/vpc/latest/cloudwan/cloudwan-attachments-working-with.html#cloudwan-attachments-deleting>`__ in the *Cloud WAN User Guide*.