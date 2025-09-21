**To test a connection to an endpoint**

The following ``test-connection`` example tests whether an endpoint can be accessed from a replication instance. ::

    aws dms test-connection \
        --replication-instance-arn arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE \
        --endpoint-arn arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA

Output::

    {
        "Connection": {
            "ReplicationInstanceArn": "arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE",
            "EndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA",
            "Status": "testing",
            "EndpointIdentifier": "src-database-1",
            "ReplicationInstanceIdentifier": "my-repl-instance"
        }
    }

For more information, see `Creating source and target endpoints <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Endpoints.Creating.html>`__ in the *AWS Database Migration Service User Guide*.
