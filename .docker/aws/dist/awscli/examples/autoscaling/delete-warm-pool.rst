**Example 1: To delete a warm pool**

The following example deletes the warm pool for the specified Auto Scaling group. ::

    aws autoscaling delete-warm-pool \
        --auto-scaling-group-name my-asg

This command produces no output.

For more information, see `Warm pools for Amazon EC2 Auto Scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 2: To force delete a warm pool**

To delete the warm pool without waiting for its instances to terminate, use the ``--force-delete`` option. ::

    aws autoscaling delete-warm-pool \
        --auto-scaling-group-name my-asg \
        --force-delete

This command produces no output.

For more information, see `Warm pools for Amazon EC2 Auto Scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.