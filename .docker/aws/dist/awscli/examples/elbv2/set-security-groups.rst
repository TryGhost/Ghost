**To associate a security group with a load balancer**

This example associates the specified security group with the specified load balancer.

Command::

  aws elbv2 set-security-groups --load-balancer-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188 --security-groups sg-5943793c

Output::

  {
    "SecurityGroupIds": [
        "sg-5943793c"
    ]
  }
