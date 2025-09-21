**To create a warm pool**

The following example creates a warm pool for the specified Auto Scaling group. ::

    aws autoscaling put-warm-pool \
        --auto-scaling-group-name my-asg \
        --min-size 2

This command produces no output. If a warm pool already exists, it will be updated.

For more information, see `Warm pools for Amazon EC2 Auto Scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.