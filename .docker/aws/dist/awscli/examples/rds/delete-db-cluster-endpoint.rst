**To delete a custom DB cluster endpoint**

The following ``delete-db-cluster-endpoint`` example deletes the specified custom DB cluster endpoint. ::

    aws rds delete-db-cluster-endpoint \
        --db-cluster-endpoint-identifier mycustomendpoint

Output::

   {
       "DBClusterEndpointIdentifier": "mycustomendpoint",
       "DBClusterIdentifier": "mydbcluster",
       "DBClusterEndpointResourceIdentifier": "cluster-endpoint-ANPAJ4AE5446DAEXAMPLE",
       "Endpoint": "mycustomendpoint.cluster-custom-cnpexample.us-east-1.rds.amazonaws.com",
       "Status": "deleting",
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
