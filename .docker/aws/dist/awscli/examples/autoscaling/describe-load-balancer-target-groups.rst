**To describe the load balancer target groups for an Auto Scaling group**

This example describes the load balancer target groups attached to the specified Auto Scaling group. ::

    aws autoscaling describe-load-balancer-target-groups \
        --auto-scaling-group-name my-asg

Output::

    {
        "LoadBalancerTargetGroups": [
            {
                "LoadBalancerTargetGroupARN": "arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067",
                "State": "Added"
            }
        ]
    }
