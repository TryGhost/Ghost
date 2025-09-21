**To detach a Classic Load Balancer from an Auto Scaling group**

This example detaches the specified Classic Load Balancer from the specified Auto Scaling group. ::

    aws autoscaling detach-load-balancers \
        --load-balancer-names my-load-balancer \
        --auto-scaling-group-name my-asg

This command produces no output.

For more information, see `Attaching a load balancer to your Auto Scaling group <https://docs.aws.amazon.com/autoscaling/ec2/userguide/attach-load-balancer-asg.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.