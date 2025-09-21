**To promote a replica secret to a primary**

The following ``stop-replication-to-replica`` example removes the link between a replica secret to the primary. The replica secret is promoted to a primary secret in the replica region. You must call ``stop-replication-to-replica`` from within the replica region. ::

    aws secretsmanager stop-replication-to-replica \
        --secret-id MyTestSecret

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3"
    }

For more information, see `Promote a replica secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/standalone-secret.html>`__ in the *Secrets Manager User Guide*.