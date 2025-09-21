**To detach a load balancer target group from an Auto Scaling group**

This example detaches the specified load balancer target group from the specified Auto Scaling group. ::

    aws autoscaling detach-load-balancer-target-groups \
        --auto-scaling-group-name my-asg \
        --target-group-arns arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067

This command produces no output

For more information, see `Attaching a load balancer to your Auto Scaling group <https://docs.aws.amazon.com/autoscaling/ec2/userguide/attach-load-balancer-asg.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.