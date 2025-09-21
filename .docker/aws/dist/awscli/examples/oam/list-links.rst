**To return a list of links for one monitoring account sink**

The following ``list-links`` example returns a list of links for one monitoring account sink. Run this operation in a source account to return a list of links to monitoring account sinks that this source account has. ::

    aws oam list-links

Output::

    {
        "Items": [{
            "Arn": "arn:aws:oam:us-east-2:123456789111:link/a1b2c3d4-5678-90ab-cdef-example11111",
            "Id": "a1b2c3d4-5678-90ab-cdef-example11111",
            "Label": "sourceAccount",
            "ResourceTypes": [
                "AWS::CloudWatch::Metric"
            ],
            "SinkArn": "arn:aws:oam:us-east-2:123456789012:sink/a1b2c3d4-5678-90ab-cdef-example12345"
        }]
    }

For more information, see `CloudWatch cross-account observability <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html>`__ in the *Amazon CloudWatch User Guide*.