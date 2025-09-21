**To display the tags associated with a resource**

The following ``list-tags-for-resource`` example displays the tags associated with a sink. ::

    aws oam list-tags-for-resource \
        --resource-arn arn:aws:oam:us-east-2:123456789012:sink/a1b2c3d4-5678-90ab-cdef-example12345

Output::

    {
        "Tags": {
            "Team": "Devops"
        }
    }

For more information, see `CloudWatch cross-account observability <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html>`__ in the *Amazon CloudWatch User Guide*.