**Example 1: To describe a rule**

The following ``describe-rules`` example displays details for the specified rule. ::

    aws elbv2 describe-rules \
        --rule-arns arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/9683b2d02a6cabee

**Example 2: To describe the rules for a listener**

The following ``describe-rules`` example displays details for the rules for the specified listener. The output includes the default rule and any other rules that you've added. ::

    aws elbv2 describe-rules \
        --listener-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2
