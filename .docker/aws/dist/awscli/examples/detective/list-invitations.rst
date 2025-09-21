**To view a list of behavior graphs that an account is a member of or is invited to**

The following ``list-invitations`` example retrieves the behavior graphs that the calling account has been invited to. The results include only open and accepted invitations. They do not include rejected invitations or removed memberships. ::

    aws detective list-invitations

Output::

    {
        "Invitations": [ 
        { 
            "AccountId": "444455556666",
            "AdministratorId": "111122223333",
            "EmailAddress": "mmajor@example.com",
            "GraphArn": "arn:aws:detective:us-east-1:111122223333:graph:123412341234",
            "InvitedTime": 1579826107000,
            "MasterId": "111122223333",
            "Status": "INVITED",
            "UpdatedTime": 1579826107000
        }
    ]
    }

For more information, see `Viewing your list of behavior graph invitations<https://docs.aws.amazon.com/detective/latest/adminguide/member-view-graph-invitations.html>`__ in the *Amazon Detective Administration Guide*.