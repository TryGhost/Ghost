**To return the results of a query**

The following ``get-query-results`` example returns the results of the query that has the specified query ID. ::

    aws athena get-query-results \
        --query-execution-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "ResultSet": {
            "Rows": [
                {
                    "Data": [
                        {
                            "VarCharValue": "date"
                        },
                        {
                            "VarCharValue": "location"
                        },
                        {
                            "VarCharValue": "browser"
                        },
                        {
                            "VarCharValue": "uri"
                        },
                        {
                            "VarCharValue": "status"
                        }
                    ]
                },
                {
                    "Data": [
                        {
                            "VarCharValue": "2014-07-05"
                        },
                        {
                            "VarCharValue": "SFO4"
                        },
                        {
                            "VarCharValue": "Safari"
                        },
                        {
                            "VarCharValue": "/test-image-2.jpeg"
                        },
                        {
                            "VarCharValue": "200"
                        }
                    ]
                },
                {
                    "Data": [
                        {
                            "VarCharValue": "2014-07-05"
                        },
                        {
                            "VarCharValue": "SFO4"
                        },
                        {
                            "VarCharValue": "Opera"
                        },
                        {
                            "VarCharValue": "/test-image-2.jpeg"
                        },
                        {
                            "VarCharValue": "200"
                        }
                    ]
                },
                {
                    "Data": [
                        {
                            "VarCharValue": "2014-07-05"
                        },
                        {
                            "VarCharValue": "SFO4"
                        },
                        {
                            "VarCharValue": "Firefox"
                        },
                        {
                            "VarCharValue": "/test-image-3.jpeg"
                        },
                        {
                            "VarCharValue": "200"
                        }
                    ]
                },
                {
                    "Data": [
                        {
                            "VarCharValue": "2014-07-05"
                        },
                        {
                            "VarCharValue": "SFO4"
                        },
                        {
                            "VarCharValue": "Lynx"
                        },
                        {
                            "VarCharValue": "/test-image-3.jpeg"
                        },
                        {
                            "VarCharValue": "200"
                        }
                    ]
                },
                {
                    "Data": [
                        {
                            "VarCharValue": "2014-07-05"
                        },
                        {
                            "VarCharValue": "SFO4"
                        },
                        {
                            "VarCharValue": "IE"
                        },
                        {
                            "VarCharValue": "/test-image-2.jpeg"
                        },
                        {
                            "VarCharValue": "200"
                        }
                    ]
                },
                {
                    "Data": [
                        {
                            "VarCharValue": "2014-07-05"
                        },
                        {
                            "VarCharValue": "SFO4"
                        },
                        {
                            "VarCharValue": "Opera"
                        },
                        {
                            "VarCharValue": "/test-image-1.jpeg"
                        },
                        {
                            "VarCharValue": "200"
                        }
                    ]
                },
                {
                    "Data": [
                        {
                            "VarCharValue": "2014-07-05"
                        },
                        {
                            "VarCharValue": "SFO4"
                        },
                        {
                            "VarCharValue": "Chrome"
                        },
                        {
                            "VarCharValue": "/test-image-3.jpeg"
                        },
                        {
                            "VarCharValue": "200"
                        }
                    ]
                },
                {
                    "Data": [
                        {
                            "VarCharValue": "2014-07-05"
                        },
                        {
                            "VarCharValue": "SFO4"
                        },
                        {
                            "VarCharValue": "Firefox"
                        },
                        {
                            "VarCharValue": "/test-image-2.jpeg"
                        },
                        {
                            "VarCharValue": "200"
                        }
                    ]
                },
                {
                    "Data": [
                        {
                            "VarCharValue": "2014-07-05"
                        },
                        {
                            "VarCharValue": "SFO4"
                        },
                        {
                            "VarCharValue": "Chrome"
                        },
                        {
                            "VarCharValue": "/test-image-3.jpeg"
                        },
                        {
                            "VarCharValue": "200"
                        }
                    ]
                },
                {
                    "Data": [
                        {
                            "VarCharValue": "2014-07-05"
                        },
                        {
                            "VarCharValue": "SFO4"
                        },
                        {
                            "VarCharValue": "IE"
                        },
                        {
                            "VarCharValue": "/test-image-2.jpeg"
                        },
                        {
                            "VarCharValue": "200"
                        }
                    ]
                }
            ],
            "ResultSetMetadata": {
                "ColumnInfo": [
                    {
                        "CatalogName": "hive",
                        "SchemaName": "",
                        "TableName": "",
                        "Name": "date",
                        "Label": "date",
                        "Type": "date",
                        "Precision": 0,
                        "Scale": 0,
                        "Nullable": "UNKNOWN",
                        "CaseSensitive": false
                    },
                    {
                        "CatalogName": "hive",
                        "SchemaName": "",
                        "TableName": "",
                        "Name": "location",
                        "Label": "location",
                        "Type": "varchar",
                        "Precision": 2147483647,
                    "Data": [
    
                        "Scale": 0,
                        "Nullable": "UNKNOWN",
                        "CaseSensitive": true
                    },
                    {
                        "CatalogName": "hive",
                        "SchemaName": "",
                        "TableName": "",
                        "Name": "browser",
                        "Label": "browser",
                        "Type": "varchar",
                        "Precision": 2147483647,
                        "Scale": 0,
                        "Nullable": "UNKNOWN",
                        "CaseSensitive": true
                    },
                    {
                        "CatalogName": "hive",
                        "SchemaName": "",
                        "TableName": "",
                        "Name": "uri",
                        "Label": "uri",
                        "Type": "varchar",
                        "Precision": 2147483647,
                        "Scale": 0,
                        "Nullable": "UNKNOWN",
                        "CaseSensitive": true
                    },
                    {
                        "CatalogName": "hive",
                        "SchemaName": "",
                        "TableName": "",
                        "Name": "status",
                        "Label": "status",
                        "Type": "integer",
                        "Precision": 10,
                        "Scale": 0,
                        "Nullable": "UNKNOWN",
                        "CaseSensitive": false
                    }
                ]
            }
        },
        "UpdateCount": 0
    }

For more information, see `Working with Query Results, Output Files, and Query History <https://docs.aws.amazon.com/athena/latest/ug/querying.html>`__ in the *Amazon Athena User Guide*.