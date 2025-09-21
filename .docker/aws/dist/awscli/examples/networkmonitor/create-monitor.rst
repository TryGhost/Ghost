**Example 1: To create a network monitor with an aggregation period**

The following ``create-monitor`` example creates a monitor named ``Example_NetworkMonitor`` with an ``aggregationPeriod`` set to ``30`` seconds. The initial ``state`` of the monitor will be ``INACTIVE`` because there are no probes associated with it. The state changes to ``ACTIVE`` only when probes are added. You can use the `update-monitor <https://docs.aws.amazon.com/cli/latest/reference/networkmonitor/update-monitor.html>`__ or `create-probe <https://docs.aws.amazon.com/cli/latest/reference/networkmonitor/create-probe.html>`__ commands to add probes to this monitor. ::

    aws networkmonitor create-monitor \
         --monitor-name Example_NetworkMonitor \
         --aggregation-period 30

Output::

    {
        "monitorArn": "arn:aws:networkmonitor:region:111122223333:monitor/Example_NetworkMonitor",
        "monitorName": "Example_NetworkMonitor",
        "state": "INACTIVE",
        "aggregationPeriod": 30,
        "tags": {}
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.

**Example 2: To create a network monitor with a probe using TCP and also includes tags**

The following ``create-monitor`` example creates a monitor named ``Example_NetworkMonitor``. The command also creates one probe that uses the ``ICMP`` protocol and includes tags. Since no ``aggregationPeriod`` is passed in the request, ``60`` seconds is set as the default. The ``state`` of the monitor with the probe will be ``PENDING`` until the monitor is ``ACTIVE``. This might take several minutes, at which point the ``state`` will change to ``ACTIVE``, and you can start viewing CloudWatch metrics. ::

    aws networkmonitor create-monitor \
        --monitor-name Example_NetworkMonitor \
        --probes sourceArn=arn:aws:ec2:region:111122223333:subnet/subnet-id,destination=10.0.0.100,destinationPort=80,protocol=TCP,packetSize=56,probeTags={Name=Probe1} \
        --tags Monitor=Monitor1

Output::

    {
        "monitorArn": "arn:aws:networkmonitor:region111122223333:monitor/Example_NetworkMonitor",
        "monitorName": "Example_NetworkMonitor",
        "state": "PENDING",
        "aggregationPeriod": 60,
        "tags": {
            "Monitor": "Monitor1"
        }
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.

**Example 3: To create a network monitor with a probe using ICMP and also includes tags**

The following ``create-monitor`` example creates a monitor named ``Example_NetworkMonitor`` with an ``aggregationPeriod`` of ``30`` seconds. The command also creates one probe that uses the ``ICMP`` protocol and includes tags. Since no ``aggregationPeriod`` is passed in the request, ``60`` seconds is set as the default. The ``state`` of the monitor with the probe will be ``PENDING`` until the monitor is ``ACTIVE``. This might take several minutes, at which point the ``state`` will change to ``ACTIVE``, and you can start viewing CloudWatch metrics. ::

    aws networkmonitor create-monitor \
         --monitor-name Example_NetworkMonitor \
         --aggregation-period 30 \
         --probes sourceArn=arn:aws:ec2:region111122223333:subnet/subnet-id,destination=10.0.0.100,protocol=ICMP,packetSize=56,probeTags={Name=Probe1} \
         --tags Monitor=Monitor1

Output::

    {
        "monitorArn": "arn:aws:networkmonitor:region:111122223333:monitor/Example_NetworkMonitor",
        "monitorName": "Example_NetworkMonitor",
        "state": "PENDING",
        "aggregationPeriod": 30,
        "tags": {
            "Monitor": "Monitor1"
        }
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.