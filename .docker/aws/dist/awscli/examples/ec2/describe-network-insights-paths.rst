**To describe a path**

The following ``describe-network-insights-paths`` example describes the specified path. ::

    aws ec2 describe-network-insights-paths \
        --network-insights-path-ids nip-0b26f224f1d131fa8

Output::

    {
        "NetworkInsightsPaths": [
            {
                "NetworkInsightsPathId": "nip-0b26f224f1d131fa8",
                "NetworkInsightsPathArn": "arn:aws:ec2:us-east-1:123456789012:network-insights-path/nip-0b26f224f1d131fa8",
                "CreatedDate": "2021-01-20T22:43:46.933Z",
                "Source": "igw-0797cccdc9d73b0e5",
                "Destination": "i-0495d385ad28331c7",
                "Protocol": "tcp"
            }
        ]
    }

For more information, see `Getting started using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/reachability/getting-started-cli.html>`__ in the *Reachability Analyzer Guide*.
