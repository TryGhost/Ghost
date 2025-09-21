**To describe the available scaling adjustment types**

This example describes the available adjustment types. ::

    aws autoscaling describe-adjustment-types

Output::

    {
        "AdjustmentTypes": [
            {
                "AdjustmentType": "ChangeInCapacity"
            },
            {
                "AdjustmentType": "ExactCapacity"
            },
            {
                "AdjustmentType": "PercentChangeInCapacity"
            }
        ]
    }

For more information, see `Scaling adjustment types <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html#as-scaling-adjustment>`__ in the *Amazon EC2 Auto Scaling User Guide*.