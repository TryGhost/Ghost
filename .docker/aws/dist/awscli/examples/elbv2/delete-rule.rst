**To delete a rule**

The following ``delete-rule`` example deletes the specified rule. ::

    aws elbv2 delete-rule \
        --rule-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/1291d13826f405c3
