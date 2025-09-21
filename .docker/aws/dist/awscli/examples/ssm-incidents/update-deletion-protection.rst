**To update replication set deletion protection**

The following ``update-deletion-protection`` example updates the deletion protection in your account to protect you from deleting the last Region in your replication set. ::

    aws ssm-incidents update-deletion-protection \
        --arn "arn:aws:ssm-incidents::111122223333:replication-set/a2bcc5c9-0f53-8047-7fef-c20749989b40" \
        --deletion-protected

This command produces no output.

For more information, see `Using the Incident Manager replication set <https://docs.aws.amazon.com/incident-manager/latest/userguide/replication.html>`__ in the *Incident Manager User Guide*.