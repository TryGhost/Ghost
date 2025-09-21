**To add one or more tags to the specified resource**

The following ``tag-resource`` example adds 2 tags to the cloudwatch alarm named ``demo`` in the specified account. ::

    aws cloudwatch tag-resource \
        --resource-arn arn:aws:cloudwatch:us-east-1:123456789012:alarm:demo \
        --tags Key=stack,Value=Production Key=team,Value=Devops

This command produces no output.

For more information, see `Tagging your Amazon CloudWatch resources <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Tagging.html>`__ in the *Amazon CloudWatch User Guide*.