**To return complete information about one monitoring account sink**

The following ``get-sink`` example returns complete information about a monitoring account sink. ::

    aws oam get-sink \
        --identifier arn:aws:oam:us-east-2:123456789012:sink/a1b2c3d4-5678-90ab-cdef-example12345

Output::

    {
        "Arn": "arn:aws:oam:us-east-2:123456789012:sink/a1b2c3d4-5678-90ab-cdef-example12345",
        "Id": "a1b2c3d4-5678-90ab-cdef-example12345",
        "Name": "DemoSink",
        "Tags": {}
    }

For more information, see `CloudWatch cross-account observability <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html>`__ in the *Amazon CloudWatch User Guide*.