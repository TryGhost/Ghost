**To start a query**

The following ``start-query-workload-insights-top-contributors-data``  example starts the query which returns a query ID to retrieve the top contributors. ::

    aws networkflowmonitor start-query-workload-insights-top-contributors-data \
        --scope-id e21cda79-30a0-4c12-9299-d8629d76d8cf \
        --start-time 2024-12-09T19:00:00Z \
        --end-time 2024-12-09T19:15:00Z \
        --metric-name DATA_TRANSFERRED \
        --destination-category UNCLASSIFIED

Output::

    {
        "queryId": "cc4f4ab3-3103-33b8-80ff-d6597a0c6cea"
    }

For more information, see `Evaluate network flows with workload insights <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-configure-evaluate-flows.html>`__ in the *Amazon CloudWatch User Guide*.
