**To stop a query**

The following ``stop-query-workload-insights-top-contributors`` example stops the query in the specified account. ::

    aws networkflowmonitor stop-query-workload-insights-top-contributors \ 
        --scope-id e21cda79-30a0-4c12-9299-d8629d76d8cf \
        --query-id 1fc423d3-b144-37a6-80e6-e2c7d26eea0c

This command produces no output.

For more information, see `Evaluate network flows with workload insights <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-configure-evaluate-flows.html>`__ in the *Amazon CloudWatch User Guide*.