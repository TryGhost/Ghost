**To create a host**

The following ``create-host`` example shows how to create a host  to represent the endpoint for the infrastructure where your third-party provider is installed. This example creates a host where the third-party installed provider is GitHub Enterprise Server.

A host created through the AWS CLI is in Pending status by default. After you create a host with the CLI, use the console or the CLI to set up the host to make its status Available. ::

    aws codestar-connections create-host \
        --name MyHost \ 
        --provider-type GitHubEnterpriseServer \ 
        --provider-endpoint "https://my-instance.dev"

Output::

    {
        "HostArn": "arn:aws:codestar-connections:us-east-1:123456789012:host/My-Host-28aef605"
    }

For more information, see `Create a host (CLI) <https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-host-create.html>`__ in the *Developer Tools console User Guide*.