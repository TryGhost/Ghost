**To attach a target group to an Auto Scaling group**

This example attaches the specified target group to the specified Auto Scaling group. ::

    aws autoscaling attach-load-balancer-target-groups \
        --auto-scaling-group-name my-asg \
        --target-group-arns arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067

This command produces no output.

For more information, see `Elastic Load Balancing and Amazon EC2 Auto Scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/autoscaling-load-balancer.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.