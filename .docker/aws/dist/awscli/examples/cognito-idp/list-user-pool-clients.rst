**To list app clients**

The following ``list-user-pool-clients`` example lists the first three app clients in the requested user pool. ::

    aws cognito-idp list-user-pool-clients \
        --user-pool-id us-west-2_EXAMPLE \
        --max-results 3

Output::

    {
        "NextToken": "[Pagination token]",
        "UserPoolClients": [
            {
                "ClientId": "1example23456789",
                "ClientName": "app-client-1",
                "UserPoolId": "us-west-2_EXAMPLE"
            },
            {
                "ClientId": "2example34567890",
                "ClientName": "app-client-2",
                "UserPoolId": "us-west-2_EXAMPLE"
            },
            {
                "ClientId": "3example45678901",
                "ClientName": "app-client-3",
                "UserPoolId": "us-west-2_EXAMPLE"
            }
        ]
    }

For more information, see `App clients <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html>`__ in the *Amazon Cognito Developer Guide*.
