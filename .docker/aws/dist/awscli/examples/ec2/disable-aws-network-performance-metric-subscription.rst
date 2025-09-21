**To disable a metric subscription**

The following ``disable-aws-network-performance-metric-subscription`` example disables the monitoring of aggregate network latency between the specified source and destination Regions. ::

    aws ec2 disable-aws-network-performance-metric-subscription \
        --source us-east-1 \
        --destination eu-west-1 \
        --metric aggregate-latency \
        --statistic p50

Output::

    {
        "Output": true
    }

For more information, see `Manage CloudWatch subscriptions using the CLI <https://docs.aws.amazon.com/network-manager/latest/infrastructure-performance/getting-started-nmip-cli.html>`__ in the *Infrastructure Performance User Guide*.
