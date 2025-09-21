**To set the address type of a load balancer**

This example sets the address type of the specified load balancer to ``dualstack``. The load balancer subnets must have associated IPv6 CIDR blocks.

Command::

  aws elbv2 set-ip-address-type --load-balancer-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188 --ip-address-type dualstack

Output::

  {
      "IpAddressType": "dualstack"
  }
