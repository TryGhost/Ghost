**To tag a resource**

The following ``tag-resource`` example tags a monitor named ``Example_NetworkMonitor`` with ``Environment=Dev`` and ``Application=PetStore`` tags. ::

    aws networkmonitor tag-resource \
        --resource-arn arn:aws:networkmonitor:region:012345678910:monitor/Example_NetworkMonitor \
        --tags Environment=Dev,Application=PetStore

This command produces no output.

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.