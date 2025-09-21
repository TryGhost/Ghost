**To retrieve information about selected behavior graph member accounts**

The following ``get-members`` example retrieves information about two member accounts in the behavior graph arn:aws:detective:us-east-1:111122223333:graph:123412341234. For the two accounts, the request provides the AWS account IDs. ::

    aws detective get-members \
        --account-ids 444455556666 123456789012 \
        --graph-arn arn:aws:detective:us-east-1:111122223333:graph:123412341234

Output::

    {
        "MemberDetails": [ 
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
        { 
            "AccountId": "123456789012",
            "AdministratorId": "111122223333",
            "EmailAddress": "jstiles@example.com",
            "GraphArn": "arn:aws:detective:us-east-1:111122223333:graph:123412341234",
            "InvitedTime": 1579826107000,
            "MasterId": "111122223333",
            "Status": "INVITED",
            "UpdatedTime": 1579826107000
        }
    ],
        "UnprocessedAccounts": [ ]
    }

For more information, see `Viewing the list of accounts in a behavior graph<https://docs.aws.amazon.com/detective/latest/adminguide/graph-admin-view-accounts.html>`__ in the *Amazon Detective Administration Guide*.