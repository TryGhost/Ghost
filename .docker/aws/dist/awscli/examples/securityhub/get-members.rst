**To retrieve information about selected member accounts**

The following ``get-members`` example retrieves information about the specified member accounts. ::

    aws securityhub get-members \
        --account-ids "444455556666" "777788889999"

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
        "UnprocessedAccounts": [ ]
    }

For more information, see `Managing administrator and member accounts <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts.html>`__ in the *AWS Security Hub User Guide*.
