**To delete a load balancer**

The following ``delete-load-balancer`` example deletes the specified load balancer. ::

    aws elbv2 delete-load-balancer \
        --load-balancer-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188
