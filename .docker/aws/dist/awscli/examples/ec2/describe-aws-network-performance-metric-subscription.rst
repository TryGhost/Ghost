**To describe your metric subscriptions**

The following ``describe-aws-network-performance-metric-subscriptions`` example describes your metric subscriptions. ::

    aws ec2 describe-aws-network-performance-metric-subscriptions

Output::

    {
        "Subscriptions": [
            {
                "Source": "us-east-1",
                "Destination": "eu-west-1",
                "Metric": "aggregate-latency",
                "Statistic": "p50",
                "Period": "five-minutes"
            }
        ]
    }

For more information, see `Manage subscriptions <https://docs.aws.amazon.com/network-manager/latest/infrastructure-performance/nmip-subscriptions-cw.html>`__ in the *Infrastructure Performance User Guide*.
