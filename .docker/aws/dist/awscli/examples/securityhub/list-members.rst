**To retrieve a list of member accounts**

The following ``list-members`` example returns the list of member accounts for the requesting administrator account. ::

    aws securityhub list-members

Output::

    {
        "Members": [ 
            { 
                "AccountId": "123456789111",
                "AdministratorId": "123456789012",
                "InvitedAt": 2020-06-01T20:15:15.289000+00:00,
                "MasterId": "123456789012",
                "MemberStatus": "ASSOCIATED",
                "UpdatedAt": 2020-06-01T20:15:15.289000+00:00
            },
            { 
                "AccountId": "123456789222",
                "AdministratorId": "123456789012",
                "InvitedAt": 2020-06-01T20:15:15.289000+00:00,
                "MasterId": "123456789012",
                "MemberStatus": "ASSOCIATED",
                "UpdatedAt": 2020-06-01T20:15:15.289000+00:00
            }
        ],
    }

For more information, see `Managing administrator and member accounts <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts.html>`__ in the *AWS Security Hub User Guide*.
