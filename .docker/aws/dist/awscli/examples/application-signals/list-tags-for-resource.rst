**To display the tags associated with a CloudWatch resource**

The following ``list-tags-for-resource`` example displays the tags associated with a CloudWatch resource. ::

    aws application-signals list-tags-for-resource \
        --resource-arn "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName"

Output::

    {
        "Tags": [{
            "Key": "test",
            "Value": "value"
        }]
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.