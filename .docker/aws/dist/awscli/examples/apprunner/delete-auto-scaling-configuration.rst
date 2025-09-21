**Example 1: To delete the latest active revision of an auto scaling configuration**

The following ``delete-auto-scaling-configuration`` example deletes the latest active revision of an App Runner auto scaling configuration.
To delete the latest active revision, specify an Amazon Resource Name (ARN) that ends with the configuration name, without the revision component.

In the example, two revisions exist before this action. Therefore, revision 2 (the latest) is deleted.
However, it now shows ``"Latest": false``, because, after being deleted, it isn't the latest active revision anymore. ::

    aws apprunner delete-auto-scaling-configuration \
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
            "DeletedAt": "2021-03-02T08:07:06Z",
            "Latest": false,
            "Status": "INACTIVE",
            "MaxConcurrency": 30,
            "MaxSize": 90,
            "MinSize": 5
        }
    }

**Example 2: To delete a specific revision of an auto scaling configuration**

The following ``delete-auto-scaling-configuration`` example deletes a specific revision of an App Runner auto scaling configuration.
To delete a specific revision, specify an ARN that includes the revision number.

In the example, several revisions exist before this action. The action deletes revision ``1``. ::

    aws apprunner delete-auto-scaling-configuration \
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
            "DeletedAt": "2021-03-02T08:07:06Z",
            "Latest": false,
            "Status": "INACTIVE",
            "MaxConcurrency": 100,
            "MaxSize": 50,
            "MinSize": 5
        }
    }
