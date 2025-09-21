**To create a contributor insights rule**

The following ``put-insight-rule`` example creates a Contributor Insights rule named ``VPCFlowLogsContributorInsights`` in the specified account. ::

    aws cloudwatch put-insight-rule \
        --rule-name VPCFlowLogsContributorInsights \
        --rule-definition file://insight-rule.json \
        --rule-state ENABLED

Contents of ``insight-rule.json``::

    {
        "Schema": {
            "Name": "CloudWatchLogRule",
            "Version": 1
        },
        "AggregateOn": "Count",
        "Contribution": {
            "Filters": [],
            "Keys": [
                "tcp-flag"
            ]
        },
        "LogFormat": "CLF",
        "LogGroupNames": [
            "/vpc/flowlogs/*"
        ],
        "Fields": {
            "23": "tcp-flag"
        }
    }

This command produces no output.

For more information, see `Create a Contributor Insights rule in CloudWatch <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContributorInsights-CreateRule.html>`__ in the *Amazon CloudWatch User Guide*.