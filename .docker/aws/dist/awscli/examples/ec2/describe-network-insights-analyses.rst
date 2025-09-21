**To view the results of a path analysis**

The following ``describe-network-insights-analyses`` example describes the specified analysis. In this example, the source is an internet gateway, the destination is an EC2 instance, and the protocol is TCP. The analysis succeeded (``Status`` is ``succeeded``) and the path is not reachable (``NetworkPathFound`` is ``false``). The explanation code ``ENI_SG_RULES_MISMATCH`` indicates that the security group for the instance does not contain a rule that allows traffic on the destination port. ::

    aws ec2 describe-network-insights-analyses \
        --network-insights-analysis-ids nia-02207aa13eb480c7a

Output::

    {
        "NetworkInsightsAnalyses": [
            {
                "NetworkInsightsAnalysisId": "nia-02207aa13eb480c7a",
                "NetworkInsightsAnalysisArn": "arn:aws:ec2:us-east-1:123456789012:network-insights-analysis/nia-02207aa13eb480c7a",
                "NetworkInsightsPathId": "nip-0b26f224f1d131fa8",
                "StartDate": "2021-01-20T22:58:37.495Z",
                "Status": "succeeded",
                "NetworkPathFound": false,
                "Explanations": [
                    {
                        "Direction": "ingress",
                        "ExplanationCode": "ENI_SG_RULES_MISMATCH",
                        "NetworkInterface": {
                            "Id": "eni-0a25edef15a6cc08c",
                            "Arn": "arn:aws:ec2:us-east-1:123456789012:network-interface/eni-0a25edef15a6cc08c"
                        },
                        "SecurityGroups": [
                            {
                                "Id": "sg-02f0d35a850ba727f",
                                "Arn": "arn:aws:ec2:us-east-1:123456789012:security-group/sg-02f0d35a850ba727f"
                            }
                        ],
                        "Subnet": {
                            "Id": "subnet-004ff41eccb4d1194",
                            "Arn": "arn:aws:ec2:us-east-1:123456789012:subnet/subnet-004ff41eccb4d1194"
                        },
                        "Vpc": {
                            "Id": "vpc-f1663d98ad28331c7",
                            "Arn": "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-f1663d98ad28331c7"
                        }
                    }
                ],
                "Tags": []
            }
        ]
    }

For more information, see `Getting started using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/reachability/getting-started-cli.html>`__ in the *Reachability Analyzer Guide*.
