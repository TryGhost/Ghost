**Example 1: To list all connections**

The following ``list-connections`` example lists all App Runner connections in the AWS account. ::

    aws apprunner list-connections

Output::

    {
        "ConnectionSummaryList": [
            {
                "ConnectionArn": "arn:aws:apprunner:us-east-1:123456789012:connection/my-github-connection",
                "ConnectionName": "my-github-connection",
                "Status": "AVAILABLE",
                "CreatedAt": "2020-11-03T00:32:51Z",
                "ProviderType": "GITHUB"
            },
            {
                "ConnectionArn": "arn:aws:apprunner:us-east-1:123456789012:connection/my-github-org-connection",
                "ConnectionName": "my-github-org-connection",
                "Status": "AVAILABLE",
                "CreatedAt": "2020-11-03T02:54:17Z",
                "ProviderType": "GITHUB"
            }
        ]
    }

**Example 2: To list a connection by name**

The following ``list-connections`` example lists a connection by its name. ::

    aws apprunner list-connections \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ConnectionName": "my-github-org-connection"
    }

Output::

    {
        "ConnectionSummaryList": [
            {
                "ConnectionArn": "arn:aws:apprunner:us-east-1:123456789012:connection/my-github-org-connection",
                "ConnectionName": "my-github-org-connection",
                "Status": "AVAILABLE",
                "CreatedAt": "2020-11-03T02:54:17Z",
                "ProviderType": "GITHUB"
            }
        ]
    }
