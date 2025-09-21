**To describe Network Insights access scopes**

The following ``describe-network-insights-access-scopes`` example describes the access-scope analyses in your AWS account. ::

    aws ec2 describe-network-insights-access-scopes \
        --region us-east-1

Output::

    {
        "NetworkInsightsAccessScopes": [
            {
                "NetworkInsightsAccessScopeId": "nis-123456789111",
                "NetworkInsightsAccessScopeArn": "arn:aws:ec2:us-east-1:123456789012:network-insights-access-scope/nis-123456789111",
                "CreatedDate": "2021-11-29T21:12:41.416000+00:00",
                "UpdatedDate": "2021-11-29T21:12:41.416000+00:00",
                "Tags": []
            }
        ]
    }

For more information, see `Getting started with Network Access Analyzer using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started-cli-naa.html>`__ in the *Network Access Analyzer Guide*.