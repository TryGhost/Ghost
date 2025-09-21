**To enable a metric subscription**

The following ``enable-aws-network-performance-metric-subscription`` example enables the monitoring of aggregate network latency between the specified source and destination Regions. ::

    aws ec2 enable-aws-network-performance-metric-subscription \
        --source us-east-1 \
        --destination eu-west-1 \
        --metric aggregate-latency \
        --statistic p50

Output::

    {
        "Output": true
    }

For more information, see `Manage subscriptions <https://docs.aws.amazon.com/network-manager/latest/infrastructure-performance/nmip-subscriptions-cw.html>`__ in the *Infrastructure Performance User Guide*.