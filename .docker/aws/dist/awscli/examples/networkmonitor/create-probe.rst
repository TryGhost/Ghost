**Example 1: To create a probe that uses TCP and add it to a network monitor**

The following ``create-probe`` example creates a probe that uses the ``TCP`` ``protocol`` and adds the probe to a monitor named ``Example_NetworkMonitor``. Once created, the ``state`` of the monitor with the probe will be ``PENDING`` until the monitor is ``ACTIVE``. This might take several minutes, at which point the state will change to ``ACTIVE``, and you can start viewing CloudWatch metrics. ::

    aws networkmonitor create-probe \
        --monitor-name Example_NetworkMonitor \
        --probe sourceArn=arn:aws:ec2:region:111122223333:subnet/subnet-id,destination=10.0.0.100,destinationPort=80,protocol=TCP,packetSize=56,tags={Name=Probe1}

Output::

    {
        "probeId": "probe-12345",
        "probeArn": "arn:aws:networkmonitor:region:111122223333:probe/probe-12345",
        "destination": "10.0.0.100",
        "destinationPort": 80,
        "packetSize": 56,
        "addressFamily": "IPV4",
        "vpcId": "vpc-12345",
        "state": "PENDING",
        "createdAt": "2024-03-29T12:41:57.314000-04:00",
        "modifiedAt": "2024-03-29T12:41:57.314000-04:00",
        "tags": {
            "Name": "Probe1"
        }
    }

**Example 2: To create a probe that uses probe using ICMP and add it to a network monitor**

The following ``create-probe`` example creates a probe that uses the ``ICMP`` ``protocol`` and adds the probe to a monitor named ``Example_NetworkMonitor``. Once created, the ``state`` of the monitor with the probe will be ``PENDING`` until the monitor is ``ACTIVE``. This might take several minutes, at which point the state will change to ``ACTIVE``, and you can start viewing CloudWatch metrics. ::

    aws networkmonitor create-probe \
        --monitor-name Example_NetworkMonitor \
        --probe sourceArn=arn:aws:ec2:region:012345678910:subnet/subnet-id,destination=10.0.0.100,protocol=ICMP,packetSize=56,tags={Name=Probe1}

Output::

    {
        "probeId": "probe-12345",
        "probeArn": "arn:aws:networkmonitor:region:111122223333:probe/probe-12345",
        "destination": "10.0.0.100",
        "packetSize": 56,
        "addressFamily": "IPV4",
        "vpcId": "vpc-12345",
        "state": "PENDING",
        "createdAt": "2024-03-29T12:44:02.452000-04:00",
        "modifiedAt": "2024-03-29T12:44:02.452000-04:00",
        "tags": {
            "Name": "Probe1"
        }
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.