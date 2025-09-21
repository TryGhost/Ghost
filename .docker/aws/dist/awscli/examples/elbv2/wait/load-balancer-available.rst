**To pause running until a load balancer is available**

The following ``wait load-balancer-available`` command pauses and continues only after it confirms that the specified load balancer is available. ::

    aws elbv2 wait load-balancer-available \
        --load-balancer-arns arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188

This command produces no output.
