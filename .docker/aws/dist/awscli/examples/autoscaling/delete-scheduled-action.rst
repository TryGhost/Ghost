**To delete a scheduled action from an Auto Scaling group**

This example deletes the specified scheduled action from the specified Auto Scaling group. ::

    aws autoscaling delete-scheduled-action \
        --auto-scaling-group-name my-asg \
        --scheduled-action-name my-scheduled-action

This command produces no output.