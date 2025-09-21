**To delete a scaling policy**

This example deletes the specified scaling policy. ::

    aws autoscaling delete-policy \
        --auto-scaling-group-name my-asg \
        --policy-name alb1000-target-tracking-scaling-policy

This command produces no output.
