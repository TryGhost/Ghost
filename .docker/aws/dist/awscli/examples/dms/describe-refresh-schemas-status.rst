**To list the refresh status for an endpoint**

The following ``describe-refresh-schemas-status`` example returns the status of a previous refresh request. ::

    aws dms describe-refresh-schemas-status \
        --endpoint-arn arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA


Output::

    {
        "RefreshSchemasStatus": {
            "EndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA",
            "ReplicationInstanceArn": "arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE",
            "Status": "successful",
            "LastRefreshDate": 1590786544.605
        }
    }
