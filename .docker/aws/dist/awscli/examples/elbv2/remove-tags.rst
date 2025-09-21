**To remove tags from a load balancer**

The following ``remove-tags`` example removes the ``project`` and ``department`` tags from the specified load balancer. ::

    aws elbv2 remove-tags \
        --resource-arns arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188 \
        --tag-keys project department
