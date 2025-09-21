**To return  information about a workgroup**

The following ``get-work-group`` example returns information about the ``AthenaAdmin`` workgroup. ::

    aws athena get-work-group \
        --work-group AthenaAdmin

Output::

    {
        "WorkGroup": {
            "Name": "AthenaAdmin",
            "State": "ENABLED",
            "Configuration": {
                "ResultConfiguration": {
                    "OutputLocation": "s3://amzn-s3-demo-bucket/"
                },
                "EnforceWorkGroupConfiguration": false,
                "PublishCloudWatchMetricsEnabled": true,
                "RequesterPaysEnabled": false
            },
            "Description": "Workgroup for Athena administrators",
            "CreationTime": 1573677174.105
        }
    }

For more information, see `Managing Workgroups <https://docs.aws.amazon.com/athena/latest/ug/workgroups-create-update-delete.html>`__ in the *Amazon Athena User Guide*.
