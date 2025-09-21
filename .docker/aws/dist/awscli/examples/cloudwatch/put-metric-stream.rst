**To create a metric stream**

The following ``put-metric-stream`` example creates a metric stream named ``QuickFull-GuaFb`` in the specified account. ::

    aws cloudwatch put-metric-stream \
        --name QuickFull-GuaFbs \
        --firehose-arn arn:aws:firehose:us-east-1:123456789012:deliverystream/MetricStreams-QuickFull-GuaFbs-WnySbECG \
        --role-arn arn:aws:iam::123456789012:role/service-role/MetricStreams-FirehosePutRecords-JN10W9B3 \
        --output-format json \
        --no-include-linked-accounts-metrics

Output::

    {
        "Arn": "arn:aws:cloudwatch:us-east-1:123456789012:metric-stream/QuickFull-GuaFbs"
    }
    
For more information, see `Set up a metric stream <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-setup.html>`__ in the *Amazon CloudWatch User Guide*.