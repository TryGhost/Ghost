**To delete a Network Access Scope analysis**

The following ``delete-network-insights-access-scope-analysis`` example deletes the specified Network Access Scope analysis. ::

    aws ec2 delete-network-insights-access-scope-analysis \
        --network-insights-access-scope-analysis-id nisa-01234567891abcdef

Output::

    {
        "NetworkInsightsAccessScopeAnalysisId": "nisa-01234567891abcdef
    }

For more information, see `Getting started with Network Access Analyzer using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started-cli.html>`__ in the *Network Access Analyzer Guide*.