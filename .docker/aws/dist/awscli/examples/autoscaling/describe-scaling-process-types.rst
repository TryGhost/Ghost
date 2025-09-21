**To describe the available process types**

This example describes the available process types. ::

    aws autoscaling describe-scaling-process-types

Output::

    {
        "Processes": [
            {
                "ProcessName": "AZRebalance"
            },
            {
                "ProcessName": "AddToLoadBalancer"
            },
            {
                "ProcessName": "AlarmNotification"
            },
            {
                "ProcessName": "HealthCheck"
            },
            {
                "ProcessName": "InstanceRefresh"
            },
            {
                "ProcessName": "Launch"
            },
            {
                "ProcessName": "ReplaceUnhealthy"
            },
            {
                "ProcessName": "ScheduledActions"
            },
            {
                "ProcessName": "Terminate"
            }
        ]
    }

For more information, see `Suspending and resuming scaling processes <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-suspend-resume-processes.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.