**To stop a query**

The following ``stop-query-workload-insights-top-contributors-data`` example stops the query in the specified account. ::

    aws networkflowmonitor stop-query-workload-insights-top-contributors-data \ 
        --scope-id e21cda79-30a0-4c12-9299-d8629d76d8cf \
        --query-id cc4f4ab3-3103-33b8-80ff-d6597a0c6cea

This command produces no output.

For more information, see `Evaluate network flows with workload insights <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-configure-evaluate-flows.html>`__ in the *Amazon CloudWatch User Guide*.
