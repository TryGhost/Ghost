**To attach an instance to an Auto Scaling group**

This example attaches the specified instance to the specified Auto Scaling group. ::

    aws autoscaling attach-instances \
        --instance-ids i-061c63c5eb45f0416 \
        --auto-scaling-group-name my-asg

This command produces no output.
