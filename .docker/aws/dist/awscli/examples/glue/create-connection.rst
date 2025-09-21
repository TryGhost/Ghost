**To create a connection for AWS Glue data stores**

The following ``create-connection`` example creates a connection in the AWS Glue Data Catalog that provides connection information for a Kafka data store. ::

    aws glue create-connection \
        --connection-input '{ \ 
            "Name":"conn-kafka-custom", \
            "Description":"kafka connection with ssl to custom kafka", \
            "ConnectionType":"KAFKA",  \
            "ConnectionProperties":{  \
                "KAFKA_BOOTSTRAP_SERVERS":"<Kafka-broker-server-url>:<SSL-Port>", \
                "KAFKA_SSL_ENABLED":"true", \
                "KAFKA_CUSTOM_CERT": "s3://bucket/prefix/cert-file.pem" \
            }, \
            "PhysicalConnectionRequirements":{ \
                "SubnetId":"subnet-1234", \
                "SecurityGroupIdList":["sg-1234"], \
                "AvailabilityZone":"us-east-1a"} \
        }' \
        --region us-east-1 
        --endpoint https://glue.us-east-1.amazonaws.com 

This command produces no output.

For more information, see `Defining Connections in the AWS Glue Data Catalog <https://docs.aws.amazon.com/glue/latest/dg/populate-add-connection.html>`__ in the *AWS Glue Developer Guide*.
