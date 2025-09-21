**To create a scope**

The following ``create-scope`` example creates a scope that includes a set of resources for which Network Flow Monitor will generate network traffic metrics. ::

    aws networkflowmonitor create-scope \
        --targets '[{"targetIdentifier":{"targetId":{"accountId":"123456789012"},"targetType":"ACCOUNT"},"region":"us-east-1"}]'

Output::

    {
        "scopeId": "97626f8d-8a21-4b5d-813a-1a0962dd4615",
        "status": "IN_PROGRESS",
        "tags": {}
    }

For more information, see `Components and features of Network Flow Monitor <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-components.html>`__ in the *Amazon CloudWatch User Guide*.