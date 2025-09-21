**To update a scaling plan**

The following ``update-scaling-plan`` example modifies the scaling metric for an Auto Scaling group in the specified scaling plan. ::

    aws autoscaling-plans update-scaling-plan \
        --scaling-plan-name my-scaling-plan \
        --scaling-plan-version 1 \
        --scaling-instructions '{"ScalableDimension":"autoscaling:autoScalingGroup:DesiredCapacity","ResourceId":"autoScalingGroup/my-asg","ServiceNamespace":"autoscaling","TargetTrackingConfigurations":[{"PredefinedScalingMetricSpecification": {"PredefinedScalingMetricType":"ALBRequestCountPerTarget","ResourceLabel":"app/my-alb/f37c06a68c1748aa/targetgroup/my-target-group/6d4ea56ca2d6a18d"},"TargetValue":40.0}],"MinCapacity": 1,"MaxCapacity": 10}'

This command produces no output.

For more information, see `What Is AWS Auto Scaling? <https://docs.aws.amazon.com/autoscaling/plans/userguide/what-is-aws-auto-scaling.html>`__ in the *AWS Auto Scaling User Guide*.
