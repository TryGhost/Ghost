**To delete a connection**

The following ``delete-connection`` example deletes an App Runner connection.
The connection status after a successful call is ``DELETED``.
This is because the connection is no longer available. ::

    aws apprunner delete-connection \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ConnectionArn": "arn:aws:apprunner:us-east-1:123456789012:connection/my-github-connection"
    }

Output::

    {
        "Connection": {
            "ConnectionArn": "arn:aws:apprunner:us-east-1:123456789012:connection/my-github-connection",
            "ConnectionName": "my-github-connection",
            "Status": "DELETED",
            "CreatedAt": "2020-11-03T00:32:51Z",
            "ProviderType": "GITHUB"
        }
    }
