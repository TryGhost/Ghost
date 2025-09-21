**To list the member accounts in a behavior graph**

The following ``list-members`` example retrieves the invited and enabled member accounts for the behavior graph ``arn:aws:detective:us-east-1:111122223333:graph:123412341234``. The results do not include member accounts that were removed. ::

    aws detective list-members \
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
            },
            { 
                "AccountId": "123456789012",
                "AdministratorId": "111122223333",
                "EmailAddress": "jstiles@example.com",
                "GraphArn": "arn:aws:detective:us-east-1:111122223333:graph:123412341234",
                "InvitedTime": 1579826107000,
                "MasterId": "111122223333",
                "PercentOfGraphUtilization": 2,
                "PercentOfGraphUtilizationUpdatedTime": 1586287843,
                "Status": "ENABLED",
                "UpdatedTime": 1579973711000,
                "VolumeUsageInBytes": 200,
                "VolumeUsageUpdatedTime": 1586287843
            }
        ]
    }

For more information, see `Viewing the list of accounts in a behavior graph <https://docs.aws.amazon.com/detective/latest/adminguide/graph-admin-view-accounts.html>`__ in the *Amazon Detective Administration Guide*.