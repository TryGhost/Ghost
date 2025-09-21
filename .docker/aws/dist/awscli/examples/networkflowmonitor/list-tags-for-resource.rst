**To list the tags**

The following ``list-tags-for-resource`` example returns all the tags associated with the specified resource. ::

    aws networkflowmonitor list-tags-for-resource \
        --resource-arn arn:aws:networkflowmonitor:us-east-1:123456789012:monitor/Demo

Output::

    {
        "tags": {
            "Value": "Production",
            "Key": "stack"
        }
    }

For more information, see `Tagging your Amazon CloudWatch resources <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Tagging.html>`__ in the *Amazon CloudWatch User Guide*.