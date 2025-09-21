**To create a Network Access Scope**

The following ``create-network-insights-access-scope`` example creates a Network Access Scope. ::

    aws ec2 create-network-insights-access-scope \
        --cli-input-json file://access-scope-file.json

Contents of ``access-scope-file.json``::

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

Output::

    {
        "NetworkInsightsAccessScope": {
            "NetworkInsightsAccessScopeId": "nis-123456789abc01234",
            "NetworkInsightsAccessScopeArn": "arn:aws:ec2:us-east-1:123456789012:network-insights-access-scope/nis-123456789abc01234",
            "CreatedDate": "2022-01-25T19:20:28.796000+00:00",
            "UpdatedDate": "2022-01-25T19:20:28.797000+00:00"
        },
        "NetworkInsightsAccessScopeContent": {
            "NetworkInsightsAccessScopeId": "nis-123456789abc01234",
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

For more information, see `Getting started with Network Access Analyzer using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/getting-started-cli.html>`__ in the *Network Access Analyzer Guide*.