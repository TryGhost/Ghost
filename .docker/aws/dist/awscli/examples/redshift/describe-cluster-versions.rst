Get a Description of All Cluster Versions
-----------------------------------------

This example returns a description of all cluster versions.  By default, the output is in JSON format.

Command::

   aws redshift describe-cluster-versions

Result::

    {
       "ClusterVersions": [
          {
          "ClusterVersion": "1.0",
          "Description": "Initial release",
          "ClusterParameterGroupFamily": "redshift-1.0"
          } ],
       "ResponseMetadata": {
          "RequestId": "16a53de3-64cc-11e2-bec0-17624ad140dd"
       }
    }

