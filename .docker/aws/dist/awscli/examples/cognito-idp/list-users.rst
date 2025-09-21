**Example 1: To list users with a server-side filter**

The following ``list-users`` example lists 3 users in the requested user pool whose email addresses begin with ``testuser``. ::

    aws cognito-idp list-users \
        --user-pool-id us-west-2_EXAMPLE \
        --filter email^=\"testuser\" \
        --max-items 3 

Output::

    {
        "PaginationToken": "efgh5678EXAMPLE",
        "Users": [
            {
                "Attributes": [
                    {
                        "Name": "sub",
                        "Value": "eaad0219-2117-439f-8d46-4db20e59268f"
                    },
                    {
                        "Name": "email",
                        "Value": "testuser@example.com"
                    }
                ],
                "Enabled": true,
                "UserCreateDate": 1682955829.578,
                "UserLastModifiedDate": 1689030181.63,
                "UserStatus": "CONFIRMED",
                "Username": "testuser"
            },
            {
                "Attributes": [
                    {
                        "Name": "sub",
                        "Value": "3b994cfd-0b07-4581-be46-3c82f9a70c90"
                    },
                    {
                        "Name": "email",
                        "Value": "testuser2@example.com"
                    }
                ],
                "Enabled": true,
                "UserCreateDate": 1684427979.201,
                "UserLastModifiedDate": 1684427979.201,
                "UserStatus": "UNCONFIRMED",
                "Username": "testuser2"
            },
            {
                "Attributes": [
                    {
                        "Name": "sub",
                        "Value": "5929e0d1-4c34-42d1-9b79-a5ecacfe66f7"
                    },
                    {
                        "Name": "email",
                        "Value": "testuser3@example.com"
                    }
                ],
                "Enabled": true,
                "UserCreateDate": 1684427823.641,
                "UserLastModifiedDate": 1684427823.641,
                "UserStatus": "UNCONFIRMED",
                "Username": "testuser3@example.com"
            }
        ]
    }

For more information, see `Managing and searching for users <https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-manage-user-accounts.html>`__ in the *Amazon Cognito Developer Guide*.

**Example 2: To list users with a client-side filter**

The following ``list-users`` example lists the attributes of three users who have an attribute, in this case their email address, that contains the email domain "@example.com". If other attributes contained this string, they would also be displayed. The second user has no attributes that match the query and is excluded from the displayed output, but not from the server response. ::

    aws cognito-idp list-users \
        --user-pool-id us-west-2_EXAMPLE \
        --max-items 3 
        --query Users\[\*\].Attributes\[\?Value\.contains\(\@\,\'@example.com\'\)\]

Output::

    [
        [
            {
                "Name": "email",
                "Value": "admin@example.com"
            }
        ],
        [],
        [
            {
                "Name": "email",
                "Value": "operator@example.com"
            }
        ]
    ]

For more information, see `Managing and searching for users <https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-manage-user-accounts.html>`__ in the *Amazon Cognito Developer Guide*.
