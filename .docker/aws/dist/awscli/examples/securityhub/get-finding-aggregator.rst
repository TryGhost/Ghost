**To retrieve the current finding aggregation configuration**

The following ``get-finding-aggregator`` example retrieves the current finding aggregation configuration. ::

    aws securityhub get-finding-aggregator \
        --finding-aggregator-arn arn:aws:securityhub:us-east-1:222222222222:finding-aggregator/123e4567-e89b-12d3-a456-426652340000

Output::

    {
        "FindingAggregatorArn": "arn:aws:securityhub:us-east-1:222222222222:finding-aggregator/123e4567-e89b-12d3-a456-426652340000",
        "FindingAggregationRegion": "us-east-1",
        "RegionLinkingMode": "SPECIFIED_REGIONS",
        "Regions": "us-west-1,us-west-2"
    }

For more information, see `Viewing the current finding aggregation configuration <https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation-view-config.html>`__ in the *AWS Security Hub User Guide*.