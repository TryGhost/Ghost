**To return a list of source account links that are linked to this monitoring account sink**

The following ``list-attached-links`` example returns a list of source account links that are linked to this monitoring account sink. ::

    aws oam list-attached-links \
        --sink-identifier arn:aws:oam:us-east-2:123456789012:sink/a1b2c3d4-5678-90ab-cdef-example12345

Output::

    {
        "Items": [{
            "Label": "Monitoring account",
            "LinkArn": "arn:aws:oam:us-east-2:123456789111:link/a1b2c3d4-5678-90ab-cdef-example11111",
            "ResourceTypes": [
                "AWS::ApplicationInsights::Application",
                "AWS::Logs::LogGroup",
                "AWS::CloudWatch::Metric",
                "AWS::XRay::Trace"
            ]
        }]
    }

For more information, see `CloudWatch cross-account observability <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html>`__ in the *Amazon CloudWatch User Guide*.