**To delete a replica secret**

The following ``remove-regions-from-replication`` example deletes a replica secret in eu-west-3. To delete a primary secret that is replicated to other regions, first delete the replicas and then call ``delete-secret``. ::

    aws secretsmanager remove-regions-from-replication \
        --secret-id MyTestSecret \
        --remove-replica-regions eu-west-3

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-1a2b3c",
        "ReplicationStatus": []
    }

For more information, see `Delete a replica secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/delete-replica.html>`__ in the *Secrets Manager User Guide*.