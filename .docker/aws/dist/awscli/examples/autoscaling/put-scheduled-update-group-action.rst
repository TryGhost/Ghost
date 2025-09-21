**Example 1: To add a scheduled action to an Auto Scaling group**

This example adds the specified scheduled action to the specified Auto Scaling group. ::

    aws autoscaling put-scheduled-update-group-action \
        --auto-scaling-group-name my-asg \
        --scheduled-action-name my-scheduled-action \
        --start-time "2023-05-12T08:00:00Z" \
        --min-size 2 \
        --max-size 6 \
        --desired-capacity 4

This command produces no output. If a scheduled action with the same name already exists, it will be overwritten by the new scheduled action.

For more examples, see `Scheduled scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 2: To specify a recurring schedule**

This example creates a scheduled action to scale on a recurring schedule that is scheduled to execute at 00:30 hours on the first of January, June, and December every year. ::

    aws autoscaling put-scheduled-update-group-action \
        --auto-scaling-group-name my-asg \
        --scheduled-action-name my-recurring-action \
        --recurrence "30 0 1 1,6,12 *" \
        --min-size 2 \
        --max-size 6 \
        --desired-capacity 4

This command produces no output. If a scheduled action with the same name already exists, it will be overwritten by the new scheduled action.

For more examples, see `Scheduled scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.