**To enable Availability Zones for a load balancer**

This example enables the Availability Zone for the specified subnet for the specified load balancer.

Command::

  aws elbv2 set-subnets --load-balancer-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188 --subnets subnet-8360a9e7 subnet-b7d581c0

Output::

  {
    "AvailabilityZones": [
        {
            "SubnetId": "subnet-8360a9e7",
            "ZoneName": "us-west-2a"
        },
        {
            "SubnetId": "subnet-b7d581c0",
            "ZoneName": "us-west-2b"
        }
    ]
  }
