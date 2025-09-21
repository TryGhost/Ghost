**To stop finding aggregation**

The following ``delete-finding-aggregator`` example stops finding aggregation. It is run from US East (Virginia), which is the aggregation Region. ::

    aws securityhub delete-finding-aggregator \
        --region us-east-1 \
        --finding-aggregator-arn arn:aws:securityhub:us-east-1:222222222222:finding-aggregator/123e4567-e89b-12d3-a456-426652340000

This command produces no output.

For more information, see `Stopping finding aggregation <https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation-stop.html>`__ in the *AWS Security Hub User Guide*.