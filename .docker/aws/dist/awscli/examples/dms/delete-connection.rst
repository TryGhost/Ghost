**To delete a connection**

The following ``delete-connection`` example disassociates an endpoint from a replication instance. ::

    aws dms delete-connection \
        --endpoint-arn arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA \
        --replication-instance-arn arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE

Output::

    {
        "Connection": {
            "ReplicationInstanceArn": "arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE",
            "EndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA",
            "Status": "deleting",
            "EndpointIdentifier": "src-database-1",
            "ReplicationInstanceIdentifier": "my-repl-instance"
        }
    }

For more information, see `https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Endpoints.Creating.html <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Endpoints.Creating.html>`__ in the *AWS Database Migration Service User Guide*.
