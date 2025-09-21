**To describe a traffic mirror target**

The following ``describe-traffic-mirror-targets`` example displays information about the specified traffic mirror target. ::

    aws ec2 describe-traffic-mirror-targets \
        --traffic-mirror-target-ids tmt-0dabe9b0a6EXAMPLE

Output::

    {
        "TrafficMirrorTargets": [
            {
                "TrafficMirrorTargetId": "tmt-0dabe9b0a6EXAMPLE",
                "NetworkLoadBalancerArn": "arn:aws:elasticloadbalancing:us-east-1:111122223333:loadbalancer/net/NLB/7cdec873fEXAMPLE",
                "Type": "network-load-balancer",
                "Description": "Example Network Load Balancer target",
                "OwnerId": "111122223333",
                "Tags": []
            }
        ]
    }

For more information, see `Traffic mirror targets <https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-target.html>`__ in the *Amazon VPC Traffic Mirroring Guide*.