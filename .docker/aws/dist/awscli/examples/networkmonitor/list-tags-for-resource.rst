**To list tags for a resource**

The following ``list-tags-for-resource`` example returns a list of the tags for a monitor named ``Example_NetworkMonitor``. ::

    aws networkmonitor list-tags-for-resource \
        --resource-arn arn:aws:networkmonitor:region:012345678910:monitor/Example_NetworkMonitor

Output::

    {
        "tags": {
            "Environment": "Dev",
            "Application": "PetStore"
        }
    }

For more information, see `How Amazon CloudWatch Network Monitor Works <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/nw-monitor-how-it-works.html>`__ in the *Amazon CloudWatch User Guide*.