**To describe the available lifecycle hook types**

This example describes the available lifecycle hook types. ::

    aws autoscaling describe-lifecycle-hook-types

Output::

    {
        "LifecycleHookTypes": [
            "autoscaling:EC2_INSTANCE_LAUNCHING",
            "autoscaling:EC2_INSTANCE_TERMINATING"
        ]
    }
