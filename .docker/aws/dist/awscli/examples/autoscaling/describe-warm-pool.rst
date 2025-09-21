**To describe a warm pool**

This example describes the warm pool for the specified Auto Scaling group. ::

    aws autoscaling describe-warm-pool \
        --auto-scaling-group-name my-asg

Output::

    {
        "WarmPoolConfiguration": {
            "MinSize": 2,
            "PoolState": "Stopped"
        },
        "Instances": [
            {
                "InstanceId": "i-070a5bbc7e7f40dc5",
                "InstanceType": "t2.micro",
                "AvailabilityZone": "us-west-2c",
                "LifecycleState": "Warmed:Pending",
                "HealthStatus": "Healthy",
                "LaunchTemplate": {
                    "LaunchTemplateId": "lt-00a731f6e9fa48610",
                    "LaunchTemplateName": "my-template-for-auto-scaling",
                    "Version": "6"
                }
            },
            {
                "InstanceId": "i-0b52f061814d3bd2d",
                "InstanceType": "t2.micro",
                "AvailabilityZone": "us-west-2b",
                "LifecycleState": "Warmed:Pending",
                "HealthStatus": "Healthy",
                "LaunchTemplate": {
                    "LaunchTemplateId": "lt-00a731f6e9fa48610",
                    "LaunchTemplateName": "my-template-for-auto-scaling",
                    "Version": "6"
                }
            }
        ]
    }

For more information, see `Warm pools for Amazon EC2 Auto Scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.