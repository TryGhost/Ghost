**To analyze a path**

The following ``start-network-insights-analysis`` example analyzes the path between the source and destination. To view the results of the path analysis, use the ``describe-network-insights-analyses`` command. ::

    aws ec2 start-network-insights-analysis \
        --network-insights-path-id nip-0b26f224f1d131fa8

Output::

    {
        "NetworkInsightsAnalysis": {
            "NetworkInsightsAnalysisId": "nia-02207aa13eb480c7a",
            "NetworkInsightsAnalysisArn": "arn:aws:ec2:us-east-1:123456789012:network-insights-analysis/nia-02207aa13eb480c7a",
            "NetworkInsightsPathId": "nip-0b26f224f1d131fa8",
            "StartDate": "2021-01-20T22:58:37.495Z",
            "Status": "running"
        }
    }

For more information, see `Getting started using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/reachability/getting-started-cli.html>`__ in the *Reachability Analyzer Guide*.
