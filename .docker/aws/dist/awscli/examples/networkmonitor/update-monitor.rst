**To update a monitor**

The following ``update-monitor`` example changes a monitor's ``aggregationPeriod`` from ``60`` seconds to ``30`` seconds. ::

    aws networkmonitor update-monitor \
        --monitor-name Example_NetworkMonitor \
        --aggregation-period 30

Output::

    {
        "monitorArn": "arn:aws:networkmonitor:region:012345678910:monitor/Example_NetworkMonitor",
        "monitorName": "Example_NetworkMonitor",
        "state": "PENDING",
        "aggregationPeriod": 30,
        "tags": {
            "Monitor": "Monitor1"
        }
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.