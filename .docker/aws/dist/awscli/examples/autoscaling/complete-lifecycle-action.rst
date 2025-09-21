**To complete the lifecycle action**

This example notifies Amazon EC2 Auto Scaling that the specified lifecycle action is complete so that it can finish launching or terminating the instance. ::

    aws autoscaling complete-lifecycle-action \
        --lifecycle-hook-name my-launch-hook \
        --auto-scaling-group-name my-asg \
        --lifecycle-action-result CONTINUE \
        --lifecycle-action-token bcd2f1b8-9a78-44d3-8a7a-4dd07d7cf635

This command produces no output.

For more information, see `Amazon EC2 Auto Scaling lifecycle hooks <https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.
