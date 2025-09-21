**To delete a probe**

The following ``delete-probe`` example deletes a probe with the ID ``probe-12345`` from a network monitor named ``Example_NetworkMonitor``. ::

    aws networkmonitor delete-probe \
        --monitor-name Example_NetworkMonitor \
        --probe-id probe-12345

This command produces no output.

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.