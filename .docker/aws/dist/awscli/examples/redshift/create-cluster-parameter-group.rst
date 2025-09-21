Create a Cluster Parameter Group
--------------------------------

This example creates a new cluster parameter group.

Command::

   aws redshift create-cluster-parameter-group --parameter-group-name myclusterparametergroup --parameter-group-family redshift-1.0 --description "My first cluster parameter group"

Result::

    {
       "ClusterParameterGroup": {
          "ParameterGroupFamily": "redshift-1.0",
          "Description": "My first cluster parameter group",
          "ParameterGroupName": "myclusterparametergroup"
       },
       "ResponseMetadata": {
          "RequestId": "739448f0-64cc-11e2-8f7d-3b939af52818"
       }
    }


