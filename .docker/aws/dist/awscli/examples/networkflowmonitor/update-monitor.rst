**To update an existing monitor**

The following ``update-monitor`` example updates the monitor named ``Demo`` in the specified account. ::

    aws networkflowmonitor update-monitor \
        --monitor-name Demo \
        --local-resources-to-add type="AWS::EC2::VPC",identifier="arn:aws:ec2:us-east-1:123456789012:vpc/vpc-048d08dfbec623f94" 

Output::

    {
        "monitorArn": "arn:aws:networkflowmonitor:us-east-1:123456789012:monitor/Demo",
        "monitorName": "Demo",
        "monitorStatus": "ACTIVE",
        "tags": {
            "Value": "Production",
            "Key": "stack"
        }
    }

For more information, see `Components and features of Network Flow Monitor <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-components.html>`__ in the *Amazon CloudWatch User Guide*.