**Example 1: To create a blue/green deployment for an RDS for MySQL DB instance**

The following ``create-blue-green-deployment`` example creates a blue/green deployment for a MySQL DB instance. ::

    aws rds create-blue-green-deployment \
        --blue-green-deployment-name bgd-cli-test-instance \
        --source arn:aws:rds:us-east-1:123456789012:db:my-db-instance \
        --target-engine-version 8.0 \
        --target-db-parameter-group-name mysql-80-group

Output::

    {
        "BlueGreenDeployment": {
            "BlueGreenDeploymentIdentifier": "bgd-v53303651eexfake",
            "BlueGreenDeploymentName": "bgd-cli-test-instance",
            "Source": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance",
            "SwitchoverDetails": [
                {
                    "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance"
                },
                {
                    "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-1"
                },
                {
                    "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-2"
                },
                {
                    "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-3"
                }
            ],
            "Tasks": [
                {
                    "Name": "CREATING_READ_REPLICA_OF_SOURCE",
                    "Status": "PENDING"
                },
                {
                    "Name": "DB_ENGINE_VERSION_UPGRADE",
                    "Status": "PENDING"
                },
                {
                    "Name": "CONFIGURE_BACKUPS",
                    "Status": "PENDING"
                },
                {
                    "Name": "CREATING_TOPOLOGY_OF_SOURCE",
                    "Status": "PENDING"
                }
            ],
            "Status": "PROVISIONING",
            "CreateTime": "2022-02-25T21:18:51.183000+00:00"
        }
    }

For more information, see `Creating a blue/green deployment <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-creating.html>`__ in the *Amazon RDS User Guide*.

**Example 2: To create a blue/green deployment for an Aurora MySQL DB cluster**

The following ``create-blue-green-deployment`` example creates a blue/green deployment for an Aurora MySQL DB cluster. ::

    aws rds create-blue-green-deployment \
        --blue-green-deployment-name my-blue-green-deployment \
        --source arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster \
        --target-engine-version 8.0 \
        --target-db-cluster-parameter-group-name ams-80-binlog-enabled \
        --target-db-parameter-group-name mysql-80-cluster-group

Output::

    {
          "BlueGreenDeployment": {
            "BlueGreenDeploymentIdentifier": "bgd-wi89nwzglccsfake",
            "BlueGreenDeploymentName": "my-blue-green-deployment",
            "Source": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster",
            "SwitchoverDetails": [
              {
                "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster",
                "Status": "PROVISIONING"
              },
              {
                "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-1",
                "Status": "PROVISIONING"
              },
              {
                "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-2",
                "Status": "PROVISIONING"
              },
              {
                "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-3",
                "Status": "PROVISIONING"
              },
              {
                "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-excluded-member-endpoint",
                "Status": "PROVISIONING"
              },
              {
                "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-reader-endpoint",
                "Status": "PROVISIONING"
              }
            ],
            "Tasks": [
              {
                "Name": "CREATING_READ_REPLICA_OF_SOURCE",
                "Status": "PENDING"
              },
              {
                "Name": "DB_ENGINE_VERSION_UPGRADE",
                "Status": "PENDING"
              },
              {
                "Name": "CREATE_DB_INSTANCES_FOR_CLUSTER",
                "Status": "PENDING"
              },
              {
                "Name": "CREATE_CUSTOM_ENDPOINTS",
                "Status": "PENDING"
              }
            ],
            "Status": "PROVISIONING",
            "CreateTime": "2022-02-25T21:12:00.288000+00:00"
          }
    }

For more information, see `Creating a blue/green deployment <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/blue-green-deployments-creating.html>`__ in the *Amazon Aurora User Guide*.