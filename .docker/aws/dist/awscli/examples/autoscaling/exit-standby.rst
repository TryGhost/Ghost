**To move instances out of standby mode**

This example moves the specified instance out of standby mode. ::

    aws autoscaling exit-standby \
        --instance-ids i-061c63c5eb45f0416 \
        --auto-scaling-group-name my-asg

Output::

    {
        "Activities": [
            {
                "ActivityId": "142928e1-a2dc-453a-9b24-b85ad6735928",
                "AutoScalingGroupName": "my-asg",
                "Description": "Moving EC2 instance out of Standby: i-061c63c5eb45f0416",
                "Cause": "At 2020-10-31T20:32:50Z instance i-061c63c5eb45f0416 was moved out of standby in response to a user request, increasing the capacity from 0 to 1.",
                "StartTime": "2020-10-31T20:32:50.222Z",
                "StatusCode": "PreInService",
                "Progress": 30,
                "Details": "{\"Subnet ID\":\"subnet-6194ea3b\",\"Availability Zone\":\"us-west-2c\"}"
            }
        ]
    }

For more information, see `Temporarily removing instances from your Auto Scaling group <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-enter-exit-standby.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.