**To list the tags associated with an existing alarm***

The following ``list-tags-for-resource`` example lists all the tags associated with an alarm named ``demo`` in the specified account. ::

    aws cloudwatch list-tags-for-resource \
        --resource-arn arn:aws:cloudwatch:us-east-1:123456789012:alarm:demo

Output::

    {
        "Tags": [
            {
                "Key": "stack",
                "Value": "Production"
            },
            {
                "Key": "team",
                "Value": "Devops"
            }
        ]
    }
    
For more information, see `Alarms and tagging <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_alarms_and_tagging.html>`__ in the *Amazon CloudWatch User Guide*.