**Example 1: To describe a target group**

The following ``describe-target-groups`` example displays details for the specified target group. ::

    aws elbv2 describe-target-groups \
        --target-group-arns arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067

Output::

    {
        "TargetGroups": [
            {
                "TargetGroupArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067",
                "TargetGroupName": "my-targets",
                "Protocol": "HTTP",
                "Port": 80,
                "VpcId": "vpc-3ac0fb5f",
                "HealthCheckProtocol": "HTTP",
                "HealthCheckPort": "traffic-port",
                "HealthCheckEnabled": true,
                "HealthCheckIntervalSeconds": 30,
                "HealthCheckTimeoutSeconds": 5,
                "HealthyThresholdCount": 5,
                "UnhealthyThresholdCount": 2,
                "HealthCheckPath": "/",
                "Matcher": {
                    "HttpCode": "200"
                },
                "LoadBalancerArns": [
                    "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188"
                ],
                "TargetType": "instance",
                "ProtocolVersion": "HTTP1",
                "IpAddressType": "ipv4"
            }
        ]
    }

**Example 2: To describe all target groups for a load balancer**

The following ``describe-target-groups`` example displays details for all target groups for the specified load balancer. The example uses the ``--query`` parameter to display only the target group names. ::

    aws elbv2 describe-target-groups \
        --load-balancer-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188 \
        --query TargetGroups[*].TargetGroupName

Output::

    [
        "my-instance-targets",
        "my-ip-targets",
        "my-lambda-target"
    ]

For more information, see `Target groups <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html>`__ in the *Applicaion Load Balancers Guide*.