**To modify the health check configuration for a target group**

The following ``modify-target-group`` example changes the configuration of the health checks used to evaluate the health of the targets for the specified target group. Note that due to the way the CLI parses commas, you must surround the range for the ``--matcher`` option with single quotes instead of double quotes. ::

    aws elbv2 modify-target-group \
        --target-group-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-https-targets/2453ed029918f21f \
        --health-check-protocol HTTPS \
        --health-check-port 443 \
        --matcher HttpCode='200,299'

Output::

    {
        "TargetGroups": [
            {
                "TargetGroupArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-https-targets/2453ed029918f21f",
                "TargetGroupName": "my-https-targets",
                "Protocol": "HTTPS",
                "Port": 443,
                "VpcId": "vpc-3ac0fb5f",
                "HealthCheckProtocol": "HTTPS",
                "HealthCheckPort": "443",
                "HealthCheckEnabled": true,
                "HealthCheckIntervalSeconds": 30,
                "HealthCheckTimeoutSeconds": 5,
                "HealthyThresholdCount": 5,
                "UnhealthyThresholdCount": 2,
                "Matcher": {
                    "HttpCode": "200,299"
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

For more information, see `Target groups <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html>`__ in the *Applicaion Load Balancers Guide*.