**To get the findings of Network Insights access scope analysis**

The following ``get-network-insights-access-scope-analysis-findings`` example gets the selected scope analysis findings in your AWS account. ::

    aws ec2 get-network-insights-access-scope-analysis-findings \
        --region us-east-1 \
        --network-insights-access-scope-analysis-id nis \
        --nis-123456789111 

Output::

    {
        "NetworkInsightsAccessScopeAnalysisId": "nisa-123456789222",
        "AnalysisFindings": [
            {
                "NetworkInsightsAccessScopeAnalysisId": "nisa-123456789222",
                "NetworkInsightsAccessScopeId": "nis-123456789111",
                "FindingComponents": [
                    {
                        "SequenceNumber": 1,
                        "Component": {
                            "Id": "eni-02e3d42d5cceca67d",
                            "Arn": "arn:aws:ec2:us-east-1:936459623503:network-interface/eni-02e3d32d9cceca17d"
                        },
                        "OutboundHeader": {
                            "DestinationAddresses": [
                                "0.0.0.0/5",
                                "11.0.0.0/8",
                                "12.0.0.0/6",
                                "128.0.0.0/3",
                                "16.0.0.0/4",
                                "160.0.0.0/5",
                                "168.0.0.0/6",
                                "172.0.0.0/12"
                                "8.0.0.0/7"
                            ],
                            "DestinationPortRanges": [
                                {
                                    "From": 0,
                                    "To": 65535
                                }
                            ],
                            "Protocol": "6",
                            "SourceAddresses": [
                                "10.0.2.253/32"
                            ],
                            "SourcePortRanges": [
                                {
                                    "From": 0,
                                    "To": 65535
                                }
                            ]
                        }, [etc]
                    ]
                }
            }
        ]
    }

For more information, see `Getting started with Network Access Analyzer using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started-cli.html>`__ in the *Network Access Analyzer Guide*.
