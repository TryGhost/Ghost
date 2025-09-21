**Example 1: To enable metrics collection for an Auto Scaling group**

This example enables data collection for the specified Auto Scaling group. ::

    aws autoscaling enable-metrics-collection \
        --auto-scaling-group-name my-asg \
        --granularity "1Minute"

This command produces no output.

For more information, see `Monitoring CloudWatch metrics for your Auto Scaling groups and instances <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-instance-monitoring.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 2: To collect data for the specified metric for an Auto Scaling group**

To collect data for a specific metric, use the ``--metrics`` option. ::

    aws autoscaling enable-metrics-collection \
        --auto-scaling-group-name my-asg \
        --metrics GroupDesiredCapacity --granularity "1Minute"

This command produces no output.

For more information, see `Monitoring CloudWatch metrics for your Auto Scaling groups and instances <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-instance-monitoring.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.