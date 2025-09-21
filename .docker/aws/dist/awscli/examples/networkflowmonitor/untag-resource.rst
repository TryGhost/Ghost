**To remove a tag from the specified resource**

The following ``untag-resource`` example removes a tag from the monitor in the specified account. ::

    aws networkflowmonitor untag-resource \
        --resource-arn arn:aws:networkflowmonitor:us-east-1:123456789012:monitor/Demo \
        --tag-keys stack  

This command produces no output.

For more information, see `Tagging your Amazon CloudWatch resources <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Tagging.html>`__ in the *Amazon CloudWatch User Guide*.