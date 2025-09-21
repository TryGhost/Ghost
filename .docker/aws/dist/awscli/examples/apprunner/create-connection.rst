**To create a GitHub connection**

The following ``create-connection`` example creates a connection to a private GitHub code repository. The connection status after a successful call is ``PENDING_HANDSHAKE``. This is because an authentication handshake with the provider still hasn't happened. Complete the handshake using the App Runner console. ::

    aws apprunner create-connection \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ConnectionName": "my-github-connection",
        "ProviderType": "GITHUB"
    }

Output::

    {
        "Connection": {
            "ConnectionArn": "arn:aws:apprunner:us-east-1:123456789012:connection/my-github-connection",
            "ConnectionName": "my-github-connection",
            "Status": "PENDING_HANDSHAKE",
            "CreatedAt": "2020-11-03T00:32:51Z",
            "ProviderType": "GITHUB"
        }
    }

For more information, see `Managing App Runner connections <https://docs.aws.amazon.com/apprunner/latest/dg/manage-connections.html>`__ in the *AWS App Runner Developer Guide*.