**To assigns one or more tags (key-value pairs) to the specified CloudWatch resource, such as a service level objective**

The following ``tag-resource`` example assigns one or more tags (key-value pairs) to the specified CloudWatch resource, such as a service level objective. ::

    aws application-signals tag-resource \
        --resource-arn "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName" \
        --tags '{"Key":"test","Value":"value"}'

This command produces no output.

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.