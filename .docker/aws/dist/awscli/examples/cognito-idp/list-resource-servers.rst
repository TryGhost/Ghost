**To list resource servers**

The following ``list-resource-servers`` example lists the first two resource servers in the requested user pool. ::

    aws cognito-idp list-resource-servers \
        --user-pool-id us-west-2_EXAMPLE \
        --max-results 2

Output::

    {
        "ResourceServers": [
            {
                "Identifier": "myapi.example.com",
                "Name": "Example API with custom access control scopes",
                "Scopes": [
                    {
                        "ScopeDescription": "International customers",
                        "ScopeName": "international.read"
                    },
                    {
                        "ScopeDescription": "Domestic customers",
                        "ScopeName": "domestic.read"
                    }
                ],
                "UserPoolId": "us-west-2_EXAMPLE"
            },
            {
                "Identifier": "myapi2.example.com",
                "Name": "Another example API for access control",
                "Scopes": [
                    {
                        "ScopeDescription": "B2B customers",
                        "ScopeName": "b2b.read"
                    }
                ],
                "UserPoolId": "us-west-2_EXAMPLE"
            }
        ],
        "NextToken": "[Pagination token]"
    }

For more information, see `Access control with resource servers <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html>`__ in the *Amazon Cognito Developer Guide*.
