**Example 1: To describe a blue/green deployment of an RDS DB instance after creation completes**

The following ``describe-blue-green-deployment`` example retrieves the details of a blue/green deployment after creation completes. ::

    aws rds describe-blue-green-deployments \
        --blue-green-deployment-identifier bgd-v53303651eexfake

Output::

    {
        "BlueGreenDeployments": [
            {
                "BlueGreenDeploymentIdentifier": "bgd-v53303651eexfake",
                "BlueGreenDeploymentName": "bgd-cli-test-instance",
                "Source": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance",
                "Target": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-green-rkfbpe",
                "SwitchoverDetails": [
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-green-rkfbpe",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-1-green-j382ha",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-2",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-2-green-ejv4ao",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-3",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-3-green-vlpz3t",
                        "Status": "AVAILABLE"
                    }
                ],
                "Tasks": [
                    {
                        "Name": "CREATING_READ_REPLICA_OF_SOURCE",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "DB_ENGINE_VERSION_UPGRADE",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "CONFIGURE_BACKUPS",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "CREATING_TOPOLOGY_OF_SOURCE",
                        "Status": "COMPLETED"
                    }
                ],
                "Status": "AVAILABLE",
                "CreateTime": "2022-02-25T21:18:51.183000+00:00"
            }
        ]
    }

For more information, see `Viewing a blue/green deployment <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-viewing.html>`__ in the *Amazon RDS User Guide*.

**Example 2: To describe a blue/green deployment for an Aurora MySQL DB cluster**

The following ``describe-blue-green-deployment`` example retrieves the details of a blue/green deployment. ::

    aws rds describe-blue-green-deployments \
        --blue-green-deployment-identifier bgd-wi89nwzglccsfake

Output::

    {
        "BlueGreenDeployments": [
            {
                "BlueGreenDeploymentIdentifier": "bgd-wi89nwzglccsfake",
                "BlueGreenDeploymentName": "my-blue-green-deployment",
                "Source": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster",
                "Target": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster-green-3rnukl",
                "SwitchoverDetails": [
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster-green-3rnukl",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-1-green-gpmaxf",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-2",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-2-green-j2oajq",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-3",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-3-green-mkxies",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-excluded-member-endpoint",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-excluded-member-endpoint-green-4sqjrq",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-reader-endpoint",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-reader-endpoint-green-gwwzlg",
                        "Status": "AVAILABLE"
                    }
                ],
                "Tasks": [
                    {
                        "Name": "CREATING_READ_REPLICA_OF_SOURCE",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "DB_ENGINE_VERSION_UPGRADE",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "CREATE_DB_INSTANCES_FOR_CLUSTER",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "CREATE_CUSTOM_ENDPOINTS",
                        "Status": "COMPLETED"
                    }
                ],
                "Status": "AVAILABLE",
                "CreateTime": "2022-02-25T21:12:00.288000+00:00"
            }
        ]
    }

For more information, see `Viewing a blue/green deployment <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/blue-green-deployments-viewing.html>`__ in the *Amazon Aurora User Guide*.


**Example 3: To describe a blue/green deployment for an Aurora MySQL cluster after switchover**

The following ``describe-blue-green-deployment`` example retrieves the details about a blue/green deployment after the green environment is promoted to be the production environment. ::

    aws rds describe-blue-green-deployments \
        --blue-green-deployment-identifier bgd-wi89nwzglccsfake

Output::

    {
        "BlueGreenDeployments": [
            {
                "BlueGreenDeploymentIdentifier": "bgd-wi89nwzglccsfake",
                "BlueGreenDeploymentName": "my-blue-green-deployment",
                "Source": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster-old1",
                "Target": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster",
                "SwitchoverDetails": [
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster-old1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster",
                        "Status": "SWITCHOVER_COMPLETED"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-1-old1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-1",
                        "Status": "SWITCHOVER_COMPLETED"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-2-old1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-2",
                        "Status": "SWITCHOVER_COMPLETED"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-3-old1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-3",
                        "Status": "SWITCHOVER_COMPLETED"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-excluded-member-endpoint-old1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-excluded-member-endpoint",
                        "Status": "SWITCHOVER_COMPLETED"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-reader-endpoint-old1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-reader-endpoint",
                        "Status": "SWITCHOVER_COMPLETED"
                    }
                ],
                "Tasks": [
                    {
                        "Name": "CREATING_READ_REPLICA_OF_SOURCE",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "DB_ENGINE_VERSION_UPGRADE",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "CREATE_DB_INSTANCES_FOR_CLUSTER",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "CREATE_CUSTOM_ENDPOINTS",
                        "Status": "COMPLETED"
                    }
                ],
                "Status": "SWITCHOVER_COMPLETED",
                "CreateTime": "2022-02-25T22:38:49.522000+00:00"
            }
        ]
    }

For more information, see `Viewing a blue/green deployment <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/blue-green-deployments-viewing.html>`__ in the *Amazon Aurora User Guide*.

**Example 4: To describe a combined blue/green deployment**

The following ``describe-blue-green-deployment`` example retrieves the details of a combined blue/green deployment. ::

    aws rds describe-blue-green-deployments

Output::

    {
        "BlueGreenDeployments": [
            {
                "BlueGreenDeploymentIdentifier": "bgd-wi89nwzgfakelccs",
                "BlueGreenDeploymentName": "my-blue-green-deployment",
                "Source": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster",
                "Target": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster-green-3rnukl",
                "SwitchoverDetails": [
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-mysql-cluster-green-3rnukl",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-1-green-gpmaxf",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-2",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-2-green-j2oajq",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-3",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-aurora-mysql-cluster-3-green-mkxies",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-excluded-member-endpoint",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-excluded-member-endpoint-green-4sqjrq",
                        "Status": "AVAILABLE"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-reader-endpoint",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:cluster-endpoint:my-reader-endpoint-green-gwwzlg",
                        "Status": "AVAILABLE"
                    }
                ],
                "Tasks": [
                    {
                        "Name": "CREATING_READ_REPLICA_OF_SOURCE",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "DB_ENGINE_VERSION_UPGRADE",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "CREATE_DB_INSTANCES_FOR_CLUSTER",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "CREATE_CUSTOM_ENDPOINTS",
                        "Status": "COMPLETED"
                    }
                ],
                "Status": "AVAILABLE",
                "CreateTime": "2022-02-25T21:12:00.288000+00:00"
            },
            {
                "BlueGreenDeploymentIdentifier": "bgd-v5330365fake1eex",
                "BlueGreenDeploymentName": "bgd-cli-test-instance",
                "Source": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-old1",
                "Target": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance",
                "SwitchoverDetails": [
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-old1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance",
                        "Status": "SWITCHOVER_COMPLETED"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-1-old1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-1",
                        "Status": "SWITCHOVER_COMPLETED"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-2-old1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-2",
                        "Status": "SWITCHOVER_COMPLETED"
                    },
                    {
                        "SourceMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-3-old1",
                        "TargetMember": "arn:aws:rds:us-east-1:123456789012:db:my-db-instance-replica-3",
                        "Status": "SWITCHOVER_COMPLETED"
                    }
                ],
                "Tasks": [
                    {
                        "Name": "CREATING_READ_REPLICA_OF_SOURCE",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "DB_ENGINE_VERSION_UPGRADE",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "CONFIGURE_BACKUPS",
                        "Status": "COMPLETED"
                    },
                    {
                        "Name": "CREATING_TOPOLOGY_OF_SOURCE",
                        "Status": "COMPLETED"
                    }
                ],
                "Status": "SWITCHOVER_COMPLETED",
                "CreateTime": "2022-02-25T22:33:22.225000+00:00"
            }
        ]
    }

For more information, see `Viewing a blue/green deployment <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-viewing.html>`__ in the *Amazon RDS User Guide* and `Viewing a blue/green deployment <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/blue-green-deployments-viewing.html>`__ in the *Amazon Aurora User Guide*.