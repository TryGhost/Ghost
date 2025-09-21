**Example 1: To create a table for a Kinesis data stream** 

The following ``create-table`` example creates a table in the AWS Glue Data Catalog that describes a Kinesis data stream. ::

    aws glue create-table \
        --database-name tempdb \
        --table-input  '{"Name":"test-kinesis-input", "StorageDescriptor":{ \
                "Columns":[ \
                    {"Name":"sensorid", "Type":"int"}, \
                    {"Name":"currenttemperature", "Type":"int"}, \
                    {"Name":"status", "Type":"string"}
                ], \
                "Location":"my-testing-stream", \
                "Parameters":{ \
                    "typeOfData":"kinesis","streamName":"my-testing-stream", \
                    "kinesisUrl":"https://kinesis.us-east-1.amazonaws.com" \
                }, \
                "SerdeInfo":{ \
                    "SerializationLibrary":"org.openx.data.jsonserde.JsonSerDe"} \
            }, \
            "Parameters":{ \
                "classification":"json"} \
            }' \
        --profile my-profile \
        --endpoint https://glue.us-east-1.amazonaws.com 

This command produces no output.

For more information, see `Defining Tables in the AWS Glue Data Catalog <https://docs.aws.amazon.com/glue/latest/dg/tables-described.html>`__ in the *AWS Glue Developer Guide*.

**Example 2: To create a table for a Kafka data store** 

The following ``create-table`` example creates a table in the AWS Glue Data Catalog that describes a Kafka data store. ::

        aws glue create-table \
            --database-name tempdb \
            --table-input  '{"Name":"test-kafka-input", "StorageDescriptor":{ \
                    "Columns":[ \
                        {"Name":"sensorid", "Type":"int"}, \
                        {"Name":"currenttemperature", "Type":"int"}, \
                        {"Name":"status", "Type":"string"}
                    ], \
                    "Location":"glue-topic", \
                    "Parameters":{ \
                        "typeOfData":"kafka","topicName":"glue-topic", \
                        "connectionName":"my-kafka-connection"
                    }, \
                    "SerdeInfo":{ \
                        "SerializationLibrary":"org.apache.hadoop.hive.serde2.OpenCSVSerde"} \
                }, \
                "Parameters":{ \
                    "separatorChar":","} \
                }' \
            --profile my-profile \
            --endpoint https://glue.us-east-1.amazonaws.com 

This command produces no output.

For more information, see `Defining Tables in the AWS Glue Data Catalog <https://docs.aws.amazon.com/glue/latest/dg/tables-described.html>`__ in the *AWS Glue Developer Guide*.

**Example 3: To create a table for a AWS S3 data store** 

The following ``create-table`` example creates a table in the AWS Glue Data Catalog that 
describes a AWS Simple Storage Service (AWS S3) data store. ::

        aws glue create-table \
            --database-name tempdb \
            --table-input  '{"Name":"s3-output", "StorageDescriptor":{ \
                    "Columns":[ \
                        {"Name":"s1", "Type":"string"}, \
                        {"Name":"s2", "Type":"int"}, \
                        {"Name":"s3", "Type":"string"}
                    ], \
                    "Location":"s3://bucket-path/", \
                    "SerdeInfo":{ \
                        "SerializationLibrary":"org.openx.data.jsonserde.JsonSerDe"} \
                }, \
                "Parameters":{ \
                    "classification":"json"} \
                }' \
            --profile my-profile \
            --endpoint https://glue.us-east-1.amazonaws.com 

This command produces no output.

For more information, see `Defining Tables in the AWS Glue Data Catalog <https://docs.aws.amazon.com/glue/latest/dg/tables-described.html>`__ in the *AWS Glue Developer Guide*.
