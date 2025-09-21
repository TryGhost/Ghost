**To list your resource share invitations**

The following ``get-resource-share-invitations`` example lists your current resource share invitations. ::

    aws ram get-resource-share-invitations

Output::

    {
        "resourceShareInvitations": [
            {
                "resourceShareInvitationArn": "arn:aws:ram:us-west2-1:111111111111:resource-share-invitation/32b639f0-14b8-7e8f-55ea-e6117EXAMPLE",
                "resourceShareName": "project-resource-share",
                "resourceShareArn": "arn:aws:ram:us-west-2:111111111111:resource-share/fcb639f0-1449-4744-35bc-a983fEXAMPLE",
                "senderAccountId": "111111111111",
                "receiverAccountId": "222222222222",
                "invitationTimestamp": 1565312166.258,
                "status": "PENDING"
            }
        ]
    }
