**To retrieve service limits for an EC2 instance type**

The following ``describe-ec2-instance-limits`` example displays the maximum allowed instances and current instances in use for the specified EC2 instance type in the current Region. The result indicates that only five of the allowed twenty instances are being used. ::

    aws gamelift describe-ec2-instance-limits \
        --ec2-instance-type m5.large

Output:: 

    {
        "EC2InstanceLimits": [
            {
                "EC2InstanceType": ""m5.large",
                "CurrentInstances": 5,
                "InstanceLimit": 20
            }
        ]
    }

For more information, see `Choose Computing Resources <https://docs.aws.amazon.com/gamelift/latest/developerguide/gamelift-ec2-instances.html>`__ in the *Amazon GameLift Developer Guide*.
