**To move instances into standby mode**

This example puts the specified instance into standby mode. This is useful for updating or troubleshooting an instance that is currently in service. ::

    aws autoscaling enter-standby \
        --instance-ids i-061c63c5eb45f0416 \
        --auto-scaling-group-name my-asg \
        --should-decrement-desired-capacity

Output::

    {
        "Activities": [
            {
                "ActivityId": "ffa056b4-6ed3-41ba-ae7c-249dfae6eba1",
                "AutoScalingGroupName": "my-asg",
                "Description": "Moving EC2 instance to Standby: i-061c63c5eb45f0416",
                "Cause": "At 2020-10-31T20:31:00Z instance i-061c63c5eb45f0416 was moved to standby in response to a user request, shrinking the capacity from 1 to 0.",
                "StartTime": "2020-10-31T20:31:00.949Z",
                "StatusCode": "InProgress",
                "Progress": 50,
                "Details": "{\"Subnet ID\":\"subnet-6194ea3b\",\"Availability Zone\":\"us-west-2c\"}"
            }
        ]
    }

For more information, see `Amazon EC2 Auto Scaling instance lifecycle <https://docs.aws.amazon.com/autoscaling/ec2/userguide/detach-instance-asg.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.