**To pause running until a load balancer is deleted**

The following ``wait load-balancers-deleted`` command pauses and continues only after it confirms that the specified load balancer is deleted.

    aws elbv2 wait load-balancers-deleted \
        --load-balancer-arns arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188

This command produces no output.
