**To enable finding aggregation**

The following ``create-finding-aggregator`` example configures finding aggregation. It is run from US East (Virginia), which designates US East (Virginia) as the aggregation Region. It indicates to only link specified Regions, and to not automatically link new Regions. It selects US West (N. California) and US West (Oregon) as the linked Regions. ::

    aws securityhub create-finding-aggregator \
        --region us-east-1 \
        --region-linking-mode SPECIFIED_REGIONS \
        --regions us-west-1,us-west-2

Output::

    {
        "FindingAggregatorArn": "arn:aws:securityhub:us-east-1:222222222222:finding-aggregator/123e4567-e89b-12d3-a456-426652340000",
        "FindingAggregationRegion": "us-east-1",
        "RegionLinkingMode": "SPECIFIED_REGIONS",
        "Regions": "us-west-1,us-west-2"
    }

For more information, see `Enabling finding aggregation <https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation-enable.html>`__ in the *AWS Security Hub User Guide*.