**Modify a parameter in a parameter group**

The following ``modify-cluster-parameter-group`` example modifies the *wlm_json_configuration* parameter for workload management. It accepts the parameters from a file that contains the JSON contents shown below. ::

    aws redshift modify-cluster-parameter-group \
        --parameter-group-name myclusterparametergroup \
        --parameters file://modify_pg.json

Contents of ``modify_pg.json``::

    [
        {
            "ParameterName": "wlm_json_configuration",
            "ParameterValue": "[{\"user_group\":\"example_user_group1\",\"query_group\": \"example_query_group1\", \"query_concurrency\":7},{\"query_concurrency\":5}]"
        }
    ]

Output::

    {
       "ParameterGroupStatus": "Your parameter group has been updated but changes won't get applied until you reboot the associated Clusters.",
       "ParameterGroupName": "myclusterparametergroup",
       "ResponseMetadata": {
          "RequestId": "09974cc0-64cd-11e2-bea9-49e0ce183f07"
       }
    }
