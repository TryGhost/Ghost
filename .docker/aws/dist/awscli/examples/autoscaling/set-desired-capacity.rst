**To set the desired capacity for an Auto Scaling group**

This example sets the desired capacity for the specified Auto Scaling group. ::

    aws autoscaling set-desired-capacity \
        --auto-scaling-group-name my-asg \
        --desired-capacity 2 \
        --honor-cooldown

This command returns to the prompt if successful.