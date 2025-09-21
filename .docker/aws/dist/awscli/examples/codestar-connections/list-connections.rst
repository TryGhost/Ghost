**To list connections**

The following ``list-connections`` example retrieves a list of all connections in your account for the Bitbucket provider type.::

    aws codestar-connections list-connections \
    --provider-type Bitbucket \
    --max-results 5 \
    --next-token: next-token

Output::

    {
        "Connections": [
            {
                "ConnectionName": "my-connection",
                "ProviderType": "Bitbucket",
                "Status": "PENDING",
                "ARN": "arn:aws:codestar-connections:us-east-1:123456789012:connection/aEXAMPLE-8aad-4d5d-8878-dfcab0bc441f",
                "OwnerAccountId": "123456789012"
            },
            {
                "ConnectionName": "my-other-connection",
                "ProviderType": "Bitbucket",
                "Status": "AVAILABLE",
                "ARN": "arn:aws:codestar-connections:us-east-1:123456789012:connection/aEXAMPLE-8aad-4d5d-8878-dfcab0bc441f",
                "OwnerAccountId": "123456789012"
            },
        ],
        "NextToken": "next-token"
    }

For more information, see `List connections (CLI) <https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-list.html#connections-list-cli>`__ in the *Developer Tools console User Guide*.