**To retrieve the status of the query**

The following ``get-query-status-monitor-top-contributors`` example displays the current status of the query in the specified account. ::

    aws networkflowmonitor get-query-status-monitor-top-contributors \
        --monitor-name Demo \
        --query-id 5398eabd-bc40-3f5f-aba3-bcb639d3c7ca

Output::

    {
        "status": "SUCCEEDED"
    }

For more information, see `Evaluate network flows with workload insights <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-configure-evaluate-flows.html>`__ in the *Amazon CloudWatch User Guide*.