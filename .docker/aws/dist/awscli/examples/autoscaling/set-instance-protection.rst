**Example 1: To enable the instance protection setting for an instance**

This example enables instance protection for the specified instance. ::

    aws autoscaling set-instance-protection \
        --instance-ids i-061c63c5eb45f0416 \
        --auto-scaling-group-name my-asg --protected-from-scale-in

This command produces no output.

**Example 2: To disable the instance protection setting for an instance**

This example disables instance protection for the specified instance. ::

    aws autoscaling set-instance-protection \
        --instance-ids i-061c63c5eb45f0416 \
        --auto-scaling-group-name my-asg \
        --no-protected-from-scale-in

This command produces no output.
