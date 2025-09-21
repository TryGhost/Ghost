**To reboot a replication instance**

The following ``reboot-replication-instance`` example reboots a replication instance. ::

    aws dms reboot-replication-instance \
        --replication-instance-arn arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE

Output::

    {
        "ReplicationInstance": {
            "ReplicationInstanceIdentifier": "my-repl-instance",
            "ReplicationInstanceClass": "dms.t2.micro",
            "ReplicationInstanceStatus": "rebooting",
            "AllocatedStorage": 5,
            "InstanceCreateTime": 1590011235.952,
        ... output omitted ...
        }
    }

For more information, see `Working with an AWS DMS Replication Instance <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.html>`__ in the *AWS Database Migration Service User Guide*.
