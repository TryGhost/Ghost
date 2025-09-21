**To attach a Classic Load Balancer to an Auto Scaling group**

This example attaches the specified Classic Load Balancer to the specified Auto Scaling group. ::

    aws autoscaling attach-load-balancers \
        --load-balancer-names my-load-balancer \
        --auto-scaling-group-name my-asg

This command produces no output.

For more information, see `Elastic Load Balancing and Amazon EC2 Auto Scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/autoscaling-load-balancer.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.