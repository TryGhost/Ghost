**To view probe details**

The following ``get-probe`` example returns details about a probe with the ``probeID`` ``probe-12345`` that's associated with a monitor named ``Example_NetworkMonitor``. ::

    aws networkmonitor get-probe \
        --monitor-name Example_NetworkMonitor \
        --probe-id probe-12345

Output::

    {
        "probeId": "probe-12345",
        "probeArn": "arn:aws:networkmonitor:region:012345678910:probe/probe-12345",
        "sourceArn": "arn:aws:ec2:region:012345678910:subnet/subnet-12345",
        "destination": "10.0.0.100",
        "destinationPort": 80,
        "protocol": "TCP",
        "packetSize": 56,
        "addressFamily": "IPV4",
        "vpcId": "vpc-12345",
        "state": "ACTIVE",
        "createdAt": "2024-03-29T12:41:57.314000-04:00",
        "modifiedAt": "2024-03-29T12:42:28.610000-04:00",
        "tags": {
            "Name": "Probe1"
        }
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.