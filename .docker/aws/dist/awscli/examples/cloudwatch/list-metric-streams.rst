**To retrieve a list of metric streams**

The following ``list-metric-streams`` example lists all the metric streams in the specified account. ::

    aws cloudwatch list-metric-streams 

Output::

    {
        "Entries": [
            {
                "Arn": "arn:aws:cloudwatch:us-east-1:123456789012:metric-stream/QuickFull-GuaFbs",
                "CreationDate": "2024-10-11T18:48:59.187000+00:00",
                "LastUpdateDate": "2024-10-11T18:48:59.187000+00:00",
                "Name": "QuickFull-GuaFbs",
                "FirehoseArn": "arn:aws:firehose:us-east-1:123456789012:deliverystream/MetricStreams-QuickFull-GuaFbs-WnySbECG",
                "State": "running",
                "OutputFormat": "json"
            }
        ]
    }

For more information, see `Use metric streams <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Metric-Streams.html>`__ in the *Amazon CloudWatch User Guide*.