**To retrieve load forecast data**

This example retrieves load forecast data for a scalable resource (an Auto Scaling group) that is associated with the specified scaling plan. ::

    aws autoscaling-plans get-scaling-plan-resource-forecast-data \
        --scaling-plan-name my-scaling-plan \
        --scaling-plan-version 1 \
        --service-namespace "autoscaling" \
        --resource-id autoScalingGroup/my-asg \
        --scalable-dimension "autoscaling:autoScalingGroup:DesiredCapacity" \
        --forecast-data-type "LoadForecast" \
        --start-time "2019-08-30T00:00:00Z" \
        --end-time "2019-09-06T00:00:00Z"

Output::

    {
        "Datapoints": [...] 
    }

For more information, see `What Is AWS Auto Scaling <https://docs.aws.amazon.com/autoscaling/plans/userguide/what-is-aws-auto-scaling.html>`__ in the *AWS Auto Scaling User Guide*.
