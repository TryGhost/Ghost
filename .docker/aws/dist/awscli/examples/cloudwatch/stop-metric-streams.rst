**To stop a specified metric stream**

The following ``stop-metric-streams`` example stops the metric stream named ``QuickFull-GuaFbs`` in the specified account. ::

    aws cloudwatch stop-metric-streams \
        --names QuickFull-GuaFbs

This command produces no output.

For more information, see `Use metric streams <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Metric-Streams.html>`__ in the *Amazon CloudWatch User Guide*.