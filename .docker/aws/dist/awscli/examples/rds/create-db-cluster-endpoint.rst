**To create a custom DB cluster endpoint**

The following ``create-db-cluster-endpoint`` example creates a custom DB cluster endpoint and associate it with the specified Aurora DB cluster. ::

    aws rds create-db-cluster-endpoint \
        --db-cluster-endpoint-identifier mycustomendpoint \
        --endpoint-type reader \
        --db-cluster-identifier mydbcluster \
        --static-members dbinstance1 dbinstance2

Output::

    {
        "DBClusterEndpointIdentifier": "mycustomendpoint",
        "DBClusterIdentifier": "mydbcluster",
        "DBClusterEndpointResourceIdentifier": "cluster-endpoint-ANPAJ4AE5446DAEXAMPLE",
        "Endpoint": "mycustomendpoint.cluster-custom-cnpexample.us-east-1.rds.amazonaws.com",
        "Status": "creating",
        "EndpointType": "CUSTOM",
        "CustomEndpointType": "READER",
        "StaticMembers": [
            "dbinstance1",
            "dbinstance2"
        ],
        "ExcludedMembers": [],
        "DBClusterEndpointArn": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:mycustomendpoint"
    }

For more information, see `Amazon Aurora Connection Management <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.Endpoints.html>`__ in the *Amazon Aurora User Guide*.
