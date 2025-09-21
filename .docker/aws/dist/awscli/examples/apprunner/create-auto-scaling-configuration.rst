**To create a high availability auto scaling configuration**

The following ``create-auto-scaling-configuration`` example creates an auto scaling configuration optimized for high availability by setting ``MinSize`` to 5. 
With this configuration, App Runner attempts to spread your service instances over the most Availability Zones possible, up to five, depending on the AWS Region.

The call returns an ``AutoScalingConfiguration`` object with the other settings set to their defaults.
In the example, this is the first call to create a configuration named ``high-availability``. The revision is set to 1, and it's the latest revision. ::

    aws apprunner create-auto-scaling-configuration \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "AutoScalingConfigurationName": "high-availability",
        "MinSize": 5
    }

Output::

    {
        "AutoScalingConfiguration": {
            "AutoScalingConfigurationArn": "arn:aws:apprunner:us-east-1:123456789012:autoscalingconfiguration/high-availability/1/2f50e7656d7819fead0f59672e68042e",
            "AutoScalingConfigurationName": "high-availability",
            "AutoScalingConfigurationRevision": 1,
            "CreatedAt": "2020-11-03T00:29:17Z",
            "Latest": true,
            "Status": "ACTIVE",
            "MaxConcurrency": 100,
            "MaxSize": 50,
            "MinSize": 5
        }
    }
