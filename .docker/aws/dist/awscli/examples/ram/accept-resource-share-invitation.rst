**To accept a resource share invitation**

The following ``accept-resource-share-invitation`` example accepts the specified resource share invitation. Principals in the invited account can immediately start using the resources in the share. ::

    aws ram accept-resource-share-invitation \
        --resource-share-invitation-arn arn:aws:ram:us-west-2:111111111111:resource-share-invitation/1e3477be-4a95-46b4-bbe0-c4001EXAMPLE

Output::

    {
        "resourceShareInvitation": {
            "resourceShareInvitationArn": "arn:aws:ram:us-west-2:111111111111:resource-share-invitation/1e3477be-4a95-46b4-bbe0-c4001EXAMPLE",
            "resourceShareName": "MyLicenseShare",
            "resourceShareArn": "arn:aws:ram:us-west-2:111111111111:resource-share/27d09b4b-5e12-41d1-a4f2-19dedEXAMPLE",
            "senderAccountId": "111111111111",
            "receiverAccountId": "222222222222",
            "invitationTimestamp": "2021-09-22T15:07:35.620000-07:00",
            "status": "ACCEPTED"
        }
    }
