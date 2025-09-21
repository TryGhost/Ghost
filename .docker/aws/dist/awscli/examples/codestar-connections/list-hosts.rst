**To list hosts**

The following ``list-hosts`` example retrieves a list of all hosts in your account. ::

    aws codestar-connections list-hosts

Output::

    {
        "Hosts": [
            {
                "Name": "My-Host",
                "HostArn": "arn:aws:codestar-connections:us-east-1:123456789012:host/My-Host-28aef605",
                "ProviderType": "GitHubEnterpriseServer",
                "ProviderEndpoint": "https://my-instance.test.dev",
                "Status": "AVAILABLE"
            }
        ]
    }

For more information, see `List hosts (CLI) <https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-host-list.html>`__ in the *Developer Tools console User Guide*.