**To update a replication set**

The following ``command-name`` example deletes the us-east-2 Region from the replication set. ::

    aws ssm-incidents update-replication-set \
        --arn "arn:aws:ssm-incidents::111122223333:replication-set/a2bcc5c9-0f53-8047-7fef-c20749989b40" \
        --actions '[{"deleteRegionAction": {"regionName": "us-east-2"}}]'

This command produces no output.

For more information, see `Using the Incident Manager replication set <https://docs.aws.amazon.com/incident-manager/latest/userguide/replication.html>`__ in the *Incident Manager User Guide*.