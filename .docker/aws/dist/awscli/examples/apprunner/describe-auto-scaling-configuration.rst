**Example 1: To describe the latest active revision of an auto scaling configuration**

The following ``describe-auto-scaling-configuration`` example gets a description of the latest active revision of an App Runner auto scaling configuration. To describe the latest active revision, specify an ARN that ends with the configuration name, without the revision component.

In the example, two revisions exist. Therefore, revision ``2`` (the latest) is described. The resulting object shows ``"Latest": true``. ::

    aws apprunner describe-auto-scaling-configuration \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "AutoScalingConfigurationArn": "arn:aws:apprunner:us-east-1:123456789012:autoscalingconfiguration/high-availability"
    }

Output::

    {
        "AutoScalingConfiguration": {
            "AutoScalingConfigurationArn": "arn:aws:apprunner:us-east-1:123456789012:autoscalingconfiguration/high-availability/2/e76562f50d78042e819fead0f59672e6",
            "AutoScalingConfigurationName": "high-availability",
            "AutoScalingConfigurationRevision": 2,
            "CreatedAt": "2021-02-25T17:42:59Z",
            "Latest": true,
            "Status": "ACTIVE",
            "MaxConcurrency": 30,
            "MaxSize": 90,
            "MinSize": 5
        }
    }

**Example 2: To describe a specific revision of an auto scaling configuration**

The following ``describe-auto-scaling-configuration`` example get a description of a specific revision of an App Runner auto scaling configuration. To describe a specific revision, specify an ARN that includes the revision number.

In the example, several revisions exist and revision ``1`` is queried. The resulting object shows ``"Latest": false``. ::

    aws apprunner describe-auto-scaling-configuration \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "AutoScalingConfigurationArn": "arn:aws:apprunner:us-east-1:123456789012:autoscalingconfiguration/high-availability/1"
    }

Output::

    {
        "AutoScalingConfiguration": {
            "AutoScalingConfigurationArn": "arn:aws:apprunner:us-east-1:123456789012:autoscalingconfiguration/high-availability/1/2f50e7656d7819fead0f59672e68042e",
            "AutoScalingConfigurationName": "high-availability",
            "AutoScalingConfigurationRevision": 1,
            "CreatedAt": "2020-11-03T00:29:17Z",
            "Latest": false,
            "Status": "ACTIVE",
            "MaxConcurrency": 100,
            "MaxSize": 50,
            "MinSize": 5
        }
    }
