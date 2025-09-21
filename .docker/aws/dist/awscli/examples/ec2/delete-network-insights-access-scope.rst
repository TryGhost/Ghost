**To delete a Network Access Scope**

The following ``delete-network-insights-access-scope`` example deletes the specified Network Access Scope. ::

    aws ec2 delete-network-insights-access-scope \
        --network-insights-access-scope-id nis-123456789abc01234

Output::

    {
        "NetworkInsightsAccessScopeId": "nis-123456789abc01234"
    }

For more information, see `Getting started with Network Access Analyzer using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started-cli.html>`__ in the *Network Access Analyzer Guide*.