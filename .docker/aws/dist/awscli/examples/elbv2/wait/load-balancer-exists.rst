**To pause running until a load balancer exists**

The following ``wait load-balancer-exists`` command pauses and continues only after it confirms that the specified load balancer exists.

    aws elbv2 wait load-balancer-exists \
        --load-balancer-arns arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188

This command produces no output.
