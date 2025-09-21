**To get a paginated listing of App Runner auto scaling configurations**

The following ``list-auto-scaling-configurations`` example lists all App Runner auto scaling configurations in your AWS account.
Up to five auto scaling configurations are listed in each response. ``AutoScalingConfigurationName`` and ``LatestOnly`` aren't specified.
Their defaults cause the latest revision of all active configurations to be listed.

In this example, the response includes two results and there aren't additional ones, so no ``NextToken`` is returned. ::

    aws apprunner list-auto-scaling-configurations \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "MaxResults": 5
    }

Output::

    {
        "AutoScalingConfigurationSummaryList": [
            {
                "AutoScalingConfigurationArn": "arn:aws:apprunner:us-east-1:123456789012:autoscalingconfiguration/high-availability/2/e76562f50d78042e819fead0f59672e6",
                "AutoScalingConfigurationName": "high-availability",
                "AutoScalingConfigurationRevision": 2
            },
            {
                "AutoScalingConfigurationArn": "arn:aws:apprunner:us-east-1:123456789012:autoscalingconfiguration/low-cost/1/50d7804e7656fead0f59672e62f2e819",
                "AutoScalingConfigurationName": "low-cost",
                "AutoScalingConfigurationRevision": 1
            }
        ]
    }
