**To return the list of sinks created in the monitoring account**

The following ``list-sinks`` example returns a list of sinks created in the monitoring account. Run this operation in a monitoring account. ::

    aws oam list-sinks

Output::

    {
        "Items": [
            {
                "Arn": "arn:aws:oam:us-east-2:123456789012:sink/a1b2c3d4-5678-90ab-cdef-example12345",
                "Id": "a1b2c3d4-5678-90ab-cdef-example12345",
                "Name": "DemoSink"
            }
        ]
    }

For more information, see `CloudWatch cross-account observability <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html>`__ in the *Amazon CloudWatch User Guide*.