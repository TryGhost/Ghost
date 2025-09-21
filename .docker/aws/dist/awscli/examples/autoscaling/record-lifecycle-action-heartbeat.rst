**To record a lifecycle action heartbeat**

This example records a lifecycle action heartbeat to keep the instance in a pending state. ::

    aws autoscaling record-lifecycle-action-heartbeat \
        --lifecycle-hook-name my-launch-hook \
        --auto-scaling-group-name my-asg \
        --lifecycle-action-token bcd2f1b8-9a78-44d3-8a7a-4dd07d7cf635

This command produces no output.

For more information, see `Amazon EC2 Auto Scaling lifecycle hooks <https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

