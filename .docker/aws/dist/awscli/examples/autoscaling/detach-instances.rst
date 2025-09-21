**To detach an instance from an Auto Scaling group**

This example detaches the specified instance from the specified Auto Scaling group. ::

    aws autoscaling detach-instances \
        --instance-ids i-030017cfa84b20135 \
        --auto-scaling-group-name my-asg \
        --should-decrement-desired-capacity

Output::

    {
        "Activities": [
            {
                "ActivityId": "5091cb52-547a-47ce-a236-c9ccbc2cb2c9",
                "AutoScalingGroupName": "my-asg",
                "Description": "Detaching EC2 instance: i-030017cfa84b20135",
                "Cause": "At 2020-10-31T17:35:04Z instance i-030017cfa84b20135 was detached in response to a user request, shrinking the capacity from 2 to 1.",
                "StartTime": "2020-04-12T15:02:16.179Z",
                "StatusCode": "InProgress",
                "Progress": 50,
                "Details": "{\"Subnet ID\":\"subnet-6194ea3b\",\"Availability Zone\":\"us-west-2c\"}"
            }
        ]
    }