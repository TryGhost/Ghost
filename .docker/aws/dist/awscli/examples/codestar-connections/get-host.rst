**To get information about a host**

The following ``get-host`` example shows details about a host::

    aws codestar-connections get-host \
        --host-arn arn:aws:codestar-connections:us-east-1:123456789012:host/MyHost-28aef605

Output::

    {
        "Name": "MyHost",
        "Status": "AVAILABLE",
        "ProviderType": "GitHubEnterpriseServer",
        "ProviderEndpoint": "https://test-instance-1.dev/"
    }

For more information, see `View host details (CLI) <https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-host-view.html#connections-host-view-cli>`__ in the *Developer Tools console User Guide*.