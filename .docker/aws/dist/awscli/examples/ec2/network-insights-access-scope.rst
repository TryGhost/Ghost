**To create Network Insights access scopes**

The following ``create-network-insights-access-scope`` example creates a network insights access scope in your AWS account. ::

    aws ec2 create-network-insights-access-scope \
        --cli-input-json file://access-scope-file.json

Contents of ``access-scope-file.json``::

    {
        {
            "MatchPaths": [
                {
                    "Source": {
                        "ResourceStatement": {
                             "Resources": [
                                "vpc-abcd12e3"
                            ]
                        }
                    }
                }
            ],
            "ExcludePaths": [
                {
                    "Source": {
                        "ResourceStatement": {
                            "ResourceTypes": [
                                "AWS::EC2::InternetGateway"
                            ]
                        }
                    }
                }
            ]
        }
    }

Output::

    {
        "NetworkInsightsAccessScopeAnalysisId": "nisa-123456789111"
        }{
        "NetworkInsightsAccessScope": {
            "NetworkInsightsAccessScopeId": "nis-123456789222",
            "NetworkInsightsAccessScopeArn": "arn:aws:ec2:us-east-1:123456789222:network-insights-access-scope/nis-123456789222",
            "CreatedDate": "2022-01-25T19:20:28.796000+00:00",
            "UpdatedDate": "2022-01-25T19:20:28.797000+00:00"
        },
        "NetworkInsightsAccessScopeContent": {
            "NetworkInsightsAccessScopeId": "nis-04c0c0fbca737c404",
            "MatchPaths": [
                {
                    "Source": {
                        "ResourceStatement": {
                            "Resources": [
                                "vpc-abcd12e3"
                            ]
                        }
                    }
                }
            ],
            "ExcludePaths": [
                {
                    "Source": {
                        "ResourceStatement": {
                            "ResourceTypes": [
                                "AWS::EC2::InternetGateway"
                            ]
                        }
                    }
                }
            ]
        }
    }

For more information, see `Getting started with Network Access Analyzer using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started-cli-naa.html>`__ in the *Network Access Analyzer Guide*.