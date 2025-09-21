**Example 1: To delete the specified Auto Scaling group**

This example deletes the specified Auto Scaling group. ::

    aws autoscaling delete-auto-scaling-group \
        --auto-scaling-group-name my-asg

This command produces no output.

For more information, see `Deleting your Auto Scaling infrastructure <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-process-shutdown.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 2: To force delete the specified Auto Scaling group**

To delete the Auto Scaling group without waiting for the instances in the group to terminate, use the ``--force-delete`` option. ::

    aws autoscaling delete-auto-scaling-group \
        --auto-scaling-group-name my-asg \
        --force-delete

This command produces no output.

For more information, see `Deleting your Auto Scaling infrastructure <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-process-shutdown.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.