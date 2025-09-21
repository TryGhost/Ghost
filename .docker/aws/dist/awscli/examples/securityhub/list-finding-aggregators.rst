**To list the available widgets**

The following ``list-finding-aggregators`` example returns the ARN of the finding aggregation configuration. ::

    aws securityhub list-finding-aggregators

Output::

    {
        "FindingAggregatorArn": "arn:aws:securityhub:us-east-1:222222222222:finding-aggregator/123e4567-e89b-12d3-a456-426652340000"
    }

For more information, see `Viewing the current finding aggregation configuration <https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation-view-config.html>`__ in the *AWS Security Hub User Guide*.