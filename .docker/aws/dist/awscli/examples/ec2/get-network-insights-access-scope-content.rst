**To get Network Insights access scope content**

The following ``get-network-insights-access-scope-content`` example gets the content of the selected scope analysis ID in your AWS account. ::

    aws ec2 get-network-insights-access-scope-content \ 
        --region us-east-1 \
        --network-insights-access-scope-id nis-123456789222

Output::

    {
        "NetworkInsightsAccessScopeContent": {
            "NetworkInsightsAccessScopeId": "nis-123456789222",
            "MatchPaths": [
                {
                    "Source": {
                        "ResourceStatement": {
                            "ResourceTypes": [
                                "AWS::EC2::NetworkInterface"
                            ]
                        }
                    },
                    "Destination": {
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
