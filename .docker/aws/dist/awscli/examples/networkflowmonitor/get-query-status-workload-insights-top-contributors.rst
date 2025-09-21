**To retrieve the status of the query**

The following ``get-query-status-workload-insights-top-contributors`` example displays the current status of the query in the specified account. ::

    aws networkflowmonitor get-query-status-workload-insights-top-contributors \
        --scope-id e21cda79-30a0-4c12-9299-d8629d76d8cf \
        --query-id f2a87c70-3e5a-362e-8beb-4747d13d8419

Output::

    {
        "status": "SUCCEEDED"
    }

For more information, see `Evaluate network flows with workload insights <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-configure-evaluate-flows.html>`__ in the *Amazon CloudWatch User Guide*.