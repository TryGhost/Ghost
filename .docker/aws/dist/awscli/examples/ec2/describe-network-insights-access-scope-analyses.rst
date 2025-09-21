**To describe Network Insights access scope analyses**

The following ``describe-network-insights-access-scope-analyses`` example describes the access scope analysis in your AWS account. ::

    aws ec2 describe-network-insights-access-scope-analyses \
        --region us-east-1

Output::

    {
        "NetworkInsightsAccessScopeAnalyses": [
            {
                "NetworkInsightsAccessScopeAnalysisId": "nisa-123456789111",
                "NetworkInsightsAccessScopeAnalysisArn": "arn:aws:ec2:us-east-1:123456789012:network-insights-access-scope-analysis/nisa-123456789111",
                "NetworkInsightsAccessScopeId": "nis-123456789222",
                "Status": "succeeded",
                "StartDate": "2022-01-25T19:45:36.842000+00:00",
                "FindingsFound": "true",
                "Tags": []
            }
        ]
    }

For more information, see `Getting started with Network Access Analyzer using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started-cli-naa.html>`__ in the *Network Access Analyzer Guide*.