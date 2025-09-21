**To retrieve information about a monitor**

The following ``get-monitor`` example displays information about the monitor named ``demo`` in the specified account. ::

    aws networkflowmonitor get-monitor \ 
        --monitor-name Demo

Output::

    {
        "monitorArn": "arn:aws:networkflowmonitor:us-east-1:123456789012:monitor/Demo",
        "monitorName": "Demo",
        "monitorStatus": "ACTIVE",
        "localResources": [
            {
                "type": "AWS::EC2::VPC",
                "identifier": "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-03ea55eeda25adbb0"
            }
        ],
        "remoteResources": [],
        "createdAt": "2024-12-09T12:21:51.616000-06:00",
        "modifiedAt": "2024-12-09T12:21:55.412000-06:00",
        "tags": {}
    }

For more information, see `Components and features of Network Flow Monitor <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-components.html>`__ in the *Amazon CloudWatch User Guide*.