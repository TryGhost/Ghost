**To get information about a connection**

The following ``get-connection`` example shows details about a connection. ::

    aws codestar-connections get-connection \
        --connection-arn arn:aws:codestar-connections:us-east-1:123456789012:connection/aEXAMPLE-8aad-4d5d-8878-dfcab0bc441f

Output::

    {
        "Connection": {
            "ConnectionName": "MyConnection",
            "ConnectionArn": "arn:aws:codestar-connections:us-east-1:123456789012:connection/aEXAMPLE-8aad-4d5d-8878-dfcab0bc441f",
            "ProviderType": "Bitbucket",
            "OwnerAccountId": "123456789012",
            "ConnectionStatus": "AVAILABLE"
        }
    }

For more information, see `View connection details <https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-view-details.html>`__ in the *Developer Tools console User Guide*.