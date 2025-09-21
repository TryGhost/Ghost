**To remove one or more tags from the specified resource**

The following ``untag-resource`` example removes 2 tags from the cloudwatch alarm named ``demo`` in the specified account. ::

    aws cloudwatch untag-resource \
        --resource-arn arn:aws:cloudwatch:us-east-1:123456789012:alarm:demo \
        --tag-keys stack team

This command produces no output.

For more information, see `Tagging your Amazon CloudWatch resources <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Tagging.html>`__ in the *Amazon CloudWatch User Guide*.