**Example 1: To list all member accounts associated with the Amazon Inspector delegated administrator for your organization**

    aws inspector2 list-members \
        --only-associated

Output::

    {
            {
                 "members": [
            {
                 "accountId": "123456789012",
                 "delegatedAdminAccountId": "123456789012",
                 "relationshipStatus": "ENABLED",
                 "updatedAt": "2023-09-11T09:57:20.520000-07:00"
            },
            {
                 "accountId": "123456789012",
                 "delegatedAdminAccountId": "123456789012",
                 "relationshipStatus": "ENABLED",
                 "updatedAt": "2024-08-12T10:13:01.472000-07:00"
            },
            {
                 "accountId": "625032911453",
                 "delegatedAdminAccountId": "123456789012",
                 "relationshipStatus": "ENABLED",
                 "updatedAt": "2023-09-11T09:57:20.438000-07:00"
            },
            {
                "accountId": "715411239211",
                "delegatedAdminAccountId": "123456789012",
                "relationshipStatus": "ENABLED",
                "updatedAt": "2024-04-24T09:14:57.471000-07:00"
            }
        ]
    }

For more information, see `Managing multiple accounts in Amazon Inspector with AWS Organizations <https://docs.aws.amazon.com/inspector/latest/user/managing-multiple-accounts.html>`__ in the *Amazon Inspector User Guide*.

**Example 2: To list all member accounts associated with and disassociated from the Amazon Inspector delegated administrator for your organization**

    aws inspector2 list-members \
        --no-only-associated

Output::

    {
            {
                "members": [
            {
                "accountId": "123456789012",
                "delegatedAdminAccountId": "123456789012",
                "relationshipStatus": "REMOVED",
                "updatedAt": "2024-05-15T11:34:53.326000-07:00"
            },
            {
                "accountId": "123456789012",
                "delegatedAdminAccountId": "123456789012",
                "relationshipStatus": "ENABLED",
                "updatedAt": "2023-09-11T09:57:20.520000-07:00"
            },
            {
                "accountId": "123456789012",
                "delegatedAdminAccountId": "123456789012",
                "relationshipStatus": "ENABLED",
                "updatedAt": "2024-08-12T10:13:01.472000-07:00"
            },
            {
                "accountId": "123456789012",
                "delegatedAdminAccountId": "123456789012",
                "relationshipStatus": "ENABLED",
                "updatedAt": "2023-09-11T09:57:20.438000-07:00"
            },
            {
                "accountId": "123456789012",
                "delegatedAdminAccountId": "123456789012",
                "relationshipStatus": "ENABLED",
                "updatedAt": "2024-04-24T09:14:57.471000-07:00"
            }
        ]
    }

For more information, see `Managing multiple accounts in Amazon Inspector with AWS Organizations <https://docs.aws.amazon.com/inspector/latest/user/managing-multiple-accounts.html>`__ in the *Amazon Inspector User Guide*.
