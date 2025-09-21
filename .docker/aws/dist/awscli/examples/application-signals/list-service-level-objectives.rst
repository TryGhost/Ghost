**To return a list of SLOs created in this account.**

The following ``list-service-level-objectives`` example returns a list of SLOs created in this account. ::

    aws application-signals list-service-level-objectives

Output::

    {
        "SloSummaries": [{
            "Arn": "arn:aws:application-signals:us-east-1:123456789101:slo/test",
            "Name": "test",
            "CreatedTime": "2024-12-24T22:01:21.116000+05:30"
        }]
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.