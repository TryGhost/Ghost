**To retrieve a list of monitors**

The following ``list-monitors`` example returns returns all the monitors in the specified account. ::

    aws networkflowmonitor list-monitors 

Output::

    {
        "monitors": [
            {
                "monitorArn": "arn:aws:networkflowmonitor:us-east-1:123456789012:monitor/Demo",
                "monitorName": "Demo",
                "monitorStatus": "ACTIVE"
            }
        ]
    }

For more information, see `Components and features of Network Flow Monitor <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-components.html>`__ in the *Amazon CloudWatch User Guide*.