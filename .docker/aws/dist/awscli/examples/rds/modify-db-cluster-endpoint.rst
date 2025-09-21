**To modify a custom DB cluster endpoint**

The following ``modify-db-cluster-endpoint`` example modifies the specified custom DB cluster endpoint. ::

    aws rds modify-db-cluster-endpoint \
        --db-cluster-endpoint-identifier mycustomendpoint \
        --static-members dbinstance1 dbinstance2 dbinstance3

Output::

   {
       "DBClusterEndpointIdentifier": "mycustomendpoint",
       "DBClusterIdentifier": "mydbcluster",
       "DBClusterEndpointResourceIdentifier": "cluster-endpoint-ANPAJ4AE5446DAEXAMPLE",
       "Endpoint": "mycustomendpoint.cluster-custom-cnpexample.us-east-1.rds.amazonaws.com",
       "Status": "modifying",
       "EndpointType": "CUSTOM",
       "CustomEndpointType": "READER",
       "StaticMembers": [
           "dbinstance1",
           "dbinstance2",
           "dbinstance3"
       ],
       "ExcludedMembers": [],
       "DBClusterEndpointArn": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:mycustomendpoint"
   }

For more information, see `Amazon Aurora Connection Management <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.Endpoints.html>`__ in the *Amazon Aurora User Guide*.
