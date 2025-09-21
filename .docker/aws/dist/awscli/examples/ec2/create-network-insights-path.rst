**To create a path**

The following ``create-network-insights-path`` example creates a path. The source is the specified internet gateway and the destination is the specified EC2 instance. To determine whether the destination is reachable using the specified protocol and port, analyze the path using the ``start-network-insights-analysis`` command. ::

    aws ec2 create-network-insights-path \
        --source igw-0797cccdc9d73b0e5 \
        --destination i-0495d385ad28331c7 \
        --destination-port 22 \
        --protocol TCP

Output::

    {
        "NetworkInsightsPaths": {
            "NetworkInsightsPathId": "nip-0b26f224f1d131fa8",
            "NetworkInsightsPathArn": "arn:aws:ec2:us-east-1:123456789012:network-insights-path/nip-0b26f224f1d131fa8",
            "CreatedDate": "2021-01-20T22:43:46.933Z",
            "Source": "igw-0797cccdc9d73b0e5",
            "Destination": "i-0495d385ad28331c7",
            "Protocol": "tcp"
        }
    }

For more information, see `Getting started using the AWS CLI <https://docs.aws.amazon.com/vpc/latest/reachability/getting-started-cli.html>`__ in the *Reachability Analyzer Guide*.
