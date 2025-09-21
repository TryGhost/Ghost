**Example 1: To register an ECS service as a scalable target**

The following ``register-scalable-target`` example registers an Amazon ECS service with Application Auto Scaling. It also adds a tag with the key name ``environment`` and the value ``production`` to the scalable target. ::

    aws application-autoscaling register-scalable-target \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id service/default/web-app \
        --min-capacity 1 --max-capacity 10 \
        --tags environment=production

Output::

    {
        "ScalableTargetARN": "arn:aws:application-autoscaling:us-west-2:123456789012:scalable-target/1234abcd56ab78cd901ef1234567890ab123"
    }

For examples for other AWS services and custom resources, see the topics in `AWS services that you can use with Application Auto Scaling <https://docs.aws.amazon.com/autoscaling/application/userguide/integrated-services-list.html>`__ in the *Application Auto Scaling User Guide*.

**Example 2: To suspend scaling activities for a scalable target**

The following ``register-scalable-target`` example suspends scaling activities for an existing scalable target. ::

    aws application-autoscaling register-scalable-target \
        --service-namespace dynamodb \
        --scalable-dimension dynamodb:table:ReadCapacityUnits \
        --resource-id table/my-table \
        --suspended-state DynamicScalingInSuspended=true,DynamicScalingOutSuspended=true,ScheduledScalingSuspended=true

Output::

    {
        "ScalableTargetARN": "arn:aws:application-autoscaling:us-west-2:123456789012:scalable-target/1234abcd56ab78cd901ef1234567890ab123"
    }

For more information, see `Suspending and resuming scaling for Application Auto Scaling <https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-suspend-resume-scaling.html>`__ in the *Application Auto Scaling User Guide*.

**Example 3: To resume scaling activities for a scalable target**

The following ``register-scalable-target`` example resumes scaling activities for an existing scalable target. ::

    aws application-autoscaling register-scalable-target \
        --service-namespace dynamodb \
        --scalable-dimension dynamodb:table:ReadCapacityUnits \
        --resource-id table/my-table \
        --suspended-state DynamicScalingInSuspended=false,DynamicScalingOutSuspended=false,ScheduledScalingSuspended=false

Output::

    {
        "ScalableTargetARN": "arn:aws:application-autoscaling:us-west-2:123456789012:scalable-target/1234abcd56ab78cd901ef1234567890ab123"
    }

For more information, see `Suspending and resuming scaling for Application Auto Scaling <https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-suspend-resume-scaling.html>`__ in the *Application Auto Scaling User Guide*.
