**To start a Network Insights access scope analysis**

The following ``start-network-insights-access-scope-analysis`` example starts the scope analysis in your AWS account. ::

    aws ec2 start-network-insights-access-scope-analysis \
        --region us-east-1 \
        --network-insights-access-scope-id nis-123456789111

Output::

    {
        "NetworkInsightsAccessScopeAnalysis": {
            "NetworkInsightsAccessScopeAnalysisId": "nisa-123456789222",
            "NetworkInsightsAccessScopeAnalysisArn": "arn:aws:ec2:us-east-1:123456789012:network-insights-access-scope-analysis/nisa-123456789222",
            "NetworkInsightsAccessScopeId": "nis-123456789111",
            "Status": "running",
            "StartDate": "2022-01-26T00:47:06.814000+00:00"
        }
    }

For more information, see `Getting started with Network Access Analyzer using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started-cli.html>`__ in the *Network Access Analyzer Guide*. 
