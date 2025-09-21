**To get monitor information**

The following ``get-monitor`` example gets information about a monitor named ``Example_NetworkMonitor``. ::

    aws networkmonitor get-monitor \
        --monitor-name Example_NetworkMonitor

Output::

    {
        "monitorArn": "arn:aws:networkmonitor:region:012345678910:monitor/Example_NetworkMonitor",
        "monitorName": "Example_NetworkMonitor",
        "state": "ACTIVE",
        "aggregationPeriod": 60,
        "tags": {},
        "probes": [],
        "createdAt": "2024-04-01T17:58:07.211000-04:00",
        "modifiedAt": "2024-04-01T17:58:07.211000-04:00"
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.