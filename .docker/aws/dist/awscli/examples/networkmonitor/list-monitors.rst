**Example 1: To list all monitors (single monitor)**

The following ``list-monitors`` example returns a list of only a single monitor. The monitor's ``state`` is ``ACTIVE`` and it has an ``aggregationPeriod`` of 60 seconds. ::

    aws networkmonitor list-monitors

Output::

    {
        "monitors": [{
                "monitorArn": "arn:aws:networkmonitor:region:012345678910:monitor/Example_NetworkMonitor",
                "monitorName": "Example_NetworkMonitor",
                "state": "ACTIVE",
                "aggregationPeriod": 60,
                "tags": {
                    "Monitor": "Monitor1"
                }
            }
        ]
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.

**Example 2: To list all monitors (multiple monitors)**

The following ``list-monitors`` example returns a list of three monitors. The ``state`` of one monitor is ``ACTIVE`` and generating CloudWatch metrics. The states of the other two monitors are ``INACTIVE`` and not generating CloudWatch metrics. All three monitors use an ``aggregationPeriod`` of 60 seconds. ::

    aws networkmonitor list-monitors

Output::

    {
        "monitors": [
            {
                "monitorArn": "arn:aws:networkmonitor:us-east-1:111122223333:monitor/Example_NetworkMonitor",
                "monitorName": "Example_NetworkMonitor",
                "state": "INACTIVE",
                "aggregationPeriod": 60,
                "tags": {}
            },
            {
                "monitorArn": "arn:aws:networkmonitor:us-east-1:111122223333:monitor/Example_NetworkMonitor2",
                "monitorName": "Example_NetworkMonitor2",
                "state": "ACTIVE",
                "aggregationPeriod": 60,
                "tags": {
                    "Monitor": "Monitor1"
                }
            },
            {
                "monitorArn": "arn:aws:networkmonitor:us-east-1:111122223333:monitor/TestNetworkMonitor_CLI",
                "monitorName": "TestNetworkMonitor_CLI",
                "state": "INACTIVE",
                "aggregationPeriod": 60,
                "tags": {}
            }
        ]
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.