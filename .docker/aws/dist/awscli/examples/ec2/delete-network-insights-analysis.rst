**To delete a path analysis**

The following ``delete-network-insights-analysis`` example deletes the specified analysis. ::

    aws ec2 delete-network-insights-analysis \
        --network-insights-analysis-id nia-02207aa13eb480c7a

Output::

    {
        "NetworkInsightsAnalysisId": "nia-02207aa13eb480c7a"
    }

For more information, see `Getting started using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/reachability/getting-started-cli.html>`__ in the *Reachability Analyzer Guide*.

