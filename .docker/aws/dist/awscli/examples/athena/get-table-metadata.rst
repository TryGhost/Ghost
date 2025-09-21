**To return metadata information about a table**

The following ``get-table-metadata`` example returns metadata information about the ``counties`` table, including  including column names and their datatypes, from the ``sampledb`` database of the ``AwsDataCatalog`` data catalog. ::

    aws athena get-table-metadata \
        --catalog-name AwsDataCatalog \
        --database-name sampledb \
        --table-name counties

Output::

    {
        "TableMetadata": {
            "Name": "counties",
            "CreateTime": 1593559968.0,
            "LastAccessTime": 0.0,
            "TableType": "EXTERNAL_TABLE",
            "Columns": [
                {
                    "Name": "name",
                    "Type": "string",
                    "Comment": "from deserializer"
                },
                {
                    "Name": "boundaryshape",
                    "Type": "binary",
                    "Comment": "from deserializer"
                },
                {
                    "Name": "motto",
                    "Type": "string",
                    "Comment": "from deserializer"
                },
                {
                    "Name": "population",
                    "Type": "int",
                    "Comment": "from deserializer"
                }
            ],
            "PartitionKeys": [],
            "Parameters": {
                "EXTERNAL": "TRUE",
                "inputformat": "com.esri.json.hadoop.EnclosedJsonInputFormat",
                "location": "s3://amzn-s3-demo-bucket/json",
                "outputformat": "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
                "serde.param.serialization.format": "1",
                "serde.serialization.lib": "com.esri.hadoop.hive.serde.JsonSerde",
                "transient_lastDdlTime": "1593559968"
            }
        }
    }

For more information, see `Showing Table Details: get-table-metadata <https://docs.aws.amazon.com/athena/latest/ug/datastores-hive-cli.html#datastores-hive-cli-showing-details-of-a-table>`__ in the *Amazon Athena User Guide*.
