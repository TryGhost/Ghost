**To update a probe**

The following ``update-probe`` example updates a probe's original ``destination`` IP address and also updates the ``packetSize`` to ``60``. ::

    aws networkmonitor update-probe \
        --monitor-name Example_NetworkMonitor \
        --probe-id probe-12345 \
        --destination 10.0.0.150 \
        --packet-size 60

Output::

    {
        "probeId": "probe-12345",
        "probeArn": "arn:aws:networkmonitor:region:012345678910:probe/probe-12345",
        "sourceArn": "arn:aws:ec2:region:012345678910:subnet/subnet-12345",
        "destination": "10.0.0.150",
        "destinationPort": 80,
        "protocol": "TCP",
        "packetSize": 60,
        "addressFamily": "IPV4",
        "vpcId": "vpc-12345",
        "state": "PENDING",
        "createdAt": "2024-03-29T12:41:57.314000-04:00",
        "modifiedAt": "2024-03-29T13:52:23.115000-04:00",
        "tags": {
            "Name": "Probe1"
        }
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.