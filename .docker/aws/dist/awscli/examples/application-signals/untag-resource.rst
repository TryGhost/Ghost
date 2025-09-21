**To remove one or more tags from the specified resource**

The following ``untag-resource`` example removes one or more tags from the specified resource. ::

    aws application-signals untag-resource \
        --resource-arn "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName" \
        --tag-keys "test"

This command produces no output.

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.