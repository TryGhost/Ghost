**To describe the available metric collection types**

This example describes the available metric collection types. ::

    aws autoscaling describe-metric-collection-types

Output::

    {
        "Metrics": [
            {
                "Metric": "GroupMinSize"
            },
            {
                "Metric": "GroupMaxSize"
            },
            {
                "Metric": "GroupDesiredCapacity"
            },
            {
                "Metric": "GroupInServiceInstances"
            },
            {
                "Metric": "GroupInServiceCapacity"
            },
            {
                "Metric": "GroupPendingInstances"
            },
            {
                "Metric": "GroupPendingCapacity"
            },
            {
                "Metric": "GroupTerminatingInstances"
            },
            {
                "Metric": "GroupTerminatingCapacity"
            },
            {
                "Metric": "GroupStandbyInstances"
            },
            {
                "Metric": "GroupStandbyCapacity"
            },
            {
                "Metric": "GroupTotalInstances"
            },
            {
                "Metric": "GroupTotalCapacity"
            }
        ],
        "Granularities": [
            {
                "Granularity": "1Minute"
            }
        ]
    }

For more information, see `Auto Scaling group metrics <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-instance-monitoring.html#as-group-metrics>`__ in the *Amazon EC2 Auto Scaling User Guide*.