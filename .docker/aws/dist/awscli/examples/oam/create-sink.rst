**To create a sink**

The following ``create-sink`` example creates a sink in the current account, so that it can be used as a monitoring account in CloudWatch cross-account observability. ::

    aws oam create-sink \
        --name DemoSink

Output::

    {
        "Arn": "arn:aws:oam:us-east-2:123456789012:sink/a1b2c3d4-5678-90ab-cdef-example12345",
        "Id": "a1b2c3d4-5678-90ab-cdef-example12345",
        "Name": "DemoSink",
        "Tags": {}
    }

For more information, see `CloudWatch cross-account observability <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html>`__ in the *Amazon CloudWatch User Guide*.