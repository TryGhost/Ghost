**To set the health status of an instance**

This example sets the health status of the specified instance to ``Unhealthy``. ::

    aws autoscaling set-instance-health \
        --instance-id i-061c63c5eb45f0416 \
        --health-status Unhealthy

This command produces no output.