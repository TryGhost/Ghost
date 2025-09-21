**To retrieve information about a metric stream**

The following ``get-metric-stream`` example displays information about the metric stream named ``QuickFull-GuaFbs`` in the specified account. ::

    aws cloudwatch get-metric-stream \
        --name QuickFull-GuaFbs

Output::

    {
        "Arn": "arn:aws:cloudwatch:us-east-1:123456789012:metric-stream/QuickFull-GuaFbs",
        "Name": "QuickFull-GuaFbs",
        "FirehoseArn": "arn:aws:firehose:us-east-1:123456789012:deliverystream/MetricStreams-QuickFull-GuaFbs-WnySbECG",
        "RoleArn": "arn:aws:iam::123456789012:role/service-role/MetricStreams-FirehosePutRecords-JN10W9B3",
        "State": "running",
        "CreationDate": "2024-10-11T18:48:59.187000+00:00",
        "LastUpdateDate": "2024-10-11T18:48:59.187000+00:00",
        "OutputFormat": "json",
        "IncludeLinkedAccountsMetrics": false
    }

For more information, see `Use metric streams <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Metric-Streams.html>`__ in the *Amazon CloudWatch User Guide*.