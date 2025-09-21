**To list details on your invitations to become a member account in the current region**

The following ``list-invitations`` example lists details and statuses on your invitations to become a GuardDuty member account in the current region. ::

    aws guardduty list-invitations 

Output::
    
    {
        "Invitations": [
            {
                "InvitationId": "d6b94fb03a66ff665f7db8764example",
                "InvitedAt": "2020-06-10T17:56:38.221Z",
                "RelationshipStatus": "Invited",
                "AccountId": "123456789111"
            }
        ]
    }

For more information, see `Managing GuardDuty Accounts by Invitation <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_invitations.html>`__ in the GuardDuty User Guide.