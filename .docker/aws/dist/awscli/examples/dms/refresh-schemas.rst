**To refresh database schemas**

The following ``refresh-schemas`` example requests that AWS DMS refresh the list of schemas at an endpoint. ::

    aws dms refresh-schemas \
        --replication-instance-arn arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE \
        --endpoint-arn "arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA"

Output::

    {
        "RefreshSchemasStatus": {
            "EndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA",
            "ReplicationInstanceArn": "arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE",
            "Status": "refreshing",
            "LastRefreshDate": 1590019949.103
        }
    }
