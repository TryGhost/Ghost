**To  list the metadata for tables in the specified database of a data catalog**

The following ``list-table-metadata`` example returns metadata information for a maximum of two tables in the ``geography`` database of the ``AwsDataCatalog`` data catalog. ::

    aws athena list-table-metadata \
        --catalog-name AwsDataCatalog \
        --database-name geography \
        --max-items 2

Output::

    {
        "TableMetadataList": [
            {
                "Name": "country_codes",
                "CreateTime": 1586553454.0,
                "TableType": "EXTERNAL_TABLE",
                "Columns": [
                    {
                        "Name": "country",
                        "Type": "string",
                        "Comment": "geo id"
                    },
                    {
                        "Name": "alpha-2 code",
                        "Type": "string",
                        "Comment": "geo id2"
                    },
                    {
                        "Name": "alpha-3 code",
                        "Type": "string",
                        "Comment": "state name"
                    },
                    {
                        "Name": "numeric code",
                        "Type": "bigint",
                        "Comment": ""
                    },
                    {
                        "Name": "latitude",
                        "Type": "bigint",
                        "Comment": "location (latitude)"
                    },
                    {
                        "Name": "longitude",
                        "Type": "bigint",
                        "Comment": "location (longitude)"
                    }
                ],
                "Parameters": {
                    "areColumnsQuoted": "false",
                    "classification": "csv",
                    "columnsOrdered": "true",
                    "delimiter": ",",
                    "has_encrypted_data": "false",
                    "inputformat": "org.apache.hadoop.mapred.TextInputFormat",
                    "location": "s3://amzn-s3-demo-bucket/csv/countrycode",
                    "outputformat": "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
                    "serde.param.field.delim": ",",
                    "serde.serialization.lib": "org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe",
                    "skip.header.line.count": "1",
                    "typeOfData": "file"
                }
            },
            {
                "Name": "county_populations",
                "CreateTime": 1586553446.0,
                "TableType": "EXTERNAL_TABLE",
                "Columns": [
                    {
                        "Name": "id",
                        "Type": "string",
                        "Comment": "geo id"
                    },
                    {
                        "Name": "country",
    
                        "Name": "id2",
                        "Type": "string",
                        "Comment": "geo id2"
                    },
                    {
                        "Name": "county",
                        "Type": "string",
                        "Comment": "county name"
                    },
                    {
                        "Name": "state",
                        "Type": "string",
                        "Comment": "state name"
                    },
                    {
                        "Name": "population estimate 2018",
                        "Type": "string",
                        "Comment": ""
                    }
                ],
                "Parameters": {
                    "areColumnsQuoted": "false",
                    "classification": "csv",
                    "columnsOrdered": "true",
                    "delimiter": ",",
                    "has_encrypted_data": "false",
                    "inputformat": "org.apache.hadoop.mapred.TextInputFormat",
                    "location": "s3://amzn-s3-demo-bucket/csv/CountyPopulation",
                    "outputformat": "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
                    "serde.param.field.delim": ",",
                    "serde.serialization.lib": "org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe",
                    "skip.header.line.count": "1",
                    "typeOfData": "file"
                }
            }
        ],
        "NextToken": "eyJOZXh0VG9rZW4iOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAyfQ=="
    }

For more information, see `Showing Metadata for All Tables in a Database: list-table-metadata <https://docs.aws.amazon.com/athena/latest/ug/datastores-hive-cli.html#datastores-hive-cli-showing-all-table-metadata>`__ in the *Amazon Athena User Guide*.