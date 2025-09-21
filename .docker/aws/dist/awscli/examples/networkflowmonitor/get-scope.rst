**To retrieve information about a scope**

The following ``get-scope`` example displays information about a scope, such as status, tags, name and target details. ::

    aws networkflowmonitor get-scope \
        --scope-id e21cda79-30a0-4c12-9299-d8629d76d8cf

Output::

    {
        "scopeId": "e21cda79-30a0-4c12-9299-d8629d76d8cf",
        "status": "SUCCEEDED",
        "scopeArn": "arn:aws:networkflowmonitor:us-east-1:123456789012:scope/e21cda79-30a0-4c12-9299-d8629d76d8cf",
        "targets": [
            {
                "targetIdentifier": {
                    "targetId": {
                        "accountId": "123456789012"
                    },
                    "targetType": "ACCOUNT"
                },
                "region": "us-east-1"
            }
        ],
        "tags": {}
    }

For more information, see `Components and features of Network Flow Monitor <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-components.html>`__ in the *Amazon CloudWatch User Guide*.