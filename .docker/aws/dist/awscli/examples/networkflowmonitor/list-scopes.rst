**To retrieve a list of scopes**

The following ``list-scopes`` example lists all scopes in the specified account. ::

    aws networkflowmonitor list-scopes 

Output::

    {
        "scopes": [
            {
                "scopeId": "fdc20616-6bb4-4242-a24e-a748e65ca7ac",
                "status": "SUCCEEDED",
                "scopeArn": "arn:aws:networkflowmonitor:us-east-1:123456789012:scope/fdc20616-6bb4-4242-a24e-a748e65ca7ac"
            }
        ]
    }

For more information, see `Components and features of Network Flow Monitor <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-components.html>`__ in the *Amazon CloudWatch User Guide*.