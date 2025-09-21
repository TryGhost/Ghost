**To retrieve the time series data collected by a Contributor Insights rule**

The following ``get-insight-rule-report`` example returns the time series data collected by a Contributor Insights rule. ::

    aws cloudwatch get-insight-rule-report \
        --rule-name Rule-A \
        --start-time 2024-10-13T20:15:00Z \
        --end-time 2024-10-13T20:30:00Z \
        --period 300

Output::

    {
        "KeyLabels": [
            "PartitionKey"
        ],
        "AggregationStatistic": "Sum",
        "AggregateValue": 0.5,
        "ApproximateUniqueCount": 1,
        "Contributors": [
            {
                "Keys": [
                    "RequestID"
                ],
                "ApproximateAggregateValue": 0.5,
                "Datapoints": [
                    {
                        "Timestamp": "2024-10-13T21:00:00+00:00",
                        "ApproximateValue": 0.5
                    }
                ]
            }
        ],
        "RuleAttributes": []
    }

For more information, see `Use Contributor Insights to analyze high-cardinality data <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContributorInsights.html>`__ in the *Amazon CloudWatch User Guide*.