**To modify a rule**

The following ``modify-rule`` example updates the actions and conditions for the specified rule. ::

  aws elbv2 modify-rule \
    --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067 \
    --conditions Field=path-pattern,Values='/images/*'
    --rule-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/9683b2d02a6cabee

Output::

    {
        "Rules": [
            {
                "Priority": "10",
                "Conditions": [
                    {
                        "Field": "path-pattern",
                        "Values": [
                            "/images/*"
                        ]
                    }
                ],
                "RuleArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:listener-rule/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2/9683b2d02a6cabee",
                "IsDefault": false,
                "Actions": [
                    {
                        "TargetGroupArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067",
                        "Type": "forward"
                    }
                ]
            }
        ]
    }
