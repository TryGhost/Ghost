Get a Description of All Cluster Parameter Groups
-------------------------------------------------

This example returns a description of all cluster parameter groups for the
account, with column headers.  By default, the output is in JSON format.

Command::

   aws redshift describe-cluster-parameter-groups

Result::

    {
       "ParameterGroups": [
          {
             "ParameterGroupFamily": "redshift-1.0",
             "Description": "My first cluster parameter group",
             "ParameterGroupName": "myclusterparametergroup"
          } ],
       "ResponseMetadata": {
          "RequestId": "8ceb8f6f-64cc-11e2-bea9-49e0ce183f07"
       }
    }

You can also obtain the same information in text format using the ``--output text`` option.

Command::

   aws redshift describe-cluster-parameter-groups --output text

Result::

    redshift-1.0	My first cluster parameter group	myclusterparametergroup
    RESPONSEMETADATA	9e665a36-64cc-11e2-8f7d-3b939af52818


