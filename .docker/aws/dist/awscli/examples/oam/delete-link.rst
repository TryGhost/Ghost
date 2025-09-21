**To delete a link**

The following ``delete-link`` example deletes a link between a monitoring account sink and a source account. ::

    aws oam delete-link \
        --identifier arn:aws:oam:us-east-2:123456789111:link/a1b2c3d4-5678-90ab-cdef-example11111

This command produces no output.

For more information, see `CloudWatch cross-account observability <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html>`__ in the *Amazon CloudWatch User Guide*.