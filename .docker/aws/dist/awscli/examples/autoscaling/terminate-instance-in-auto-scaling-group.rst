**To terminate an instance in an Auto Scaling group**

This example terminates the specified instance from the specified Auto Scaling group without updating the size of the group. Amazon EC2 Auto Scaling launches a replacement instance after the specified instance terminates. ::

    aws autoscaling terminate-instance-in-auto-scaling-group \
        --instance-id i-061c63c5eb45f0416 \
        --no-should-decrement-desired-capacity

Output::

    {
        "Activities": [
            {
                "ActivityId": "8c35d601-793c-400c-fcd0-f64a27530df7",
                "AutoScalingGroupName": "my-asg",
                "Description": "Terminating EC2 instance: i-061c63c5eb45f0416",
                "Cause": "",
                "StartTime": "2020-10-31T20:34:25.680Z",
                "StatusCode": "InProgress",
                "Progress": 0,
                "Details": "{\"Subnet ID\":\"subnet-6194ea3b\",\"Availability Zone\":\"us-west-2c\"}"
            }
        ]
    }