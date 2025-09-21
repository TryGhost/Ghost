**To describe your lifecycle hooks**

This example describes the lifecycle hooks for the specified Auto Scaling group. ::

    aws autoscaling describe-lifecycle-hooks \
        --auto-scaling-group-name my-asg

Output::

    {
        "LifecycleHooks": [
            {
                "GlobalTimeout": 3000,
                "HeartbeatTimeout": 30,
                "AutoScalingGroupName": "my-asg",
                "LifecycleHookName": "my-launch-hook",
                "DefaultResult": "ABANDON",
                "LifecycleTransition": "autoscaling:EC2_INSTANCE_LAUNCHING"
            },
            {
                "GlobalTimeout": 6000,
                "HeartbeatTimeout": 60,
                "AutoScalingGroupName": "my-asg",
                "LifecycleHookName": "my-termination-hook",
                "DefaultResult": "CONTINUE",
                "LifecycleTransition": "autoscaling:EC2_INSTANCE_TERMINATING"
            }
        ]
    }