**To list actions**

The following ``list-actions`` example lists the available actions. ::

    aws fis list-actions

Output::

    {
        "actions": [
            {
                "id": "aws:ec2:reboot-instances",
                "description": "Reboot the specified EC2 instances.",
                "targets": {
                    "Instances": {
                        "resourceType": "aws:ec2:instance"
                    }
                },
                "tags": {}
            },
            {
                "id": "aws:ec2:stop-instances",
                "description": "Stop the specified EC2 instances.",
                "targets": {
                    "Instances": {
                        "resourceType": "aws:ec2:instance"
                    }
                },
                "tags": {}
            },
            {
                "id": "aws:ec2:terminate-instances",
                "description": "Terminate the specified EC2 instances.",
                "targets": {
                    "Instances": {
                        "resourceType": "aws:ec2:instance"
                    }
                },
                "tags": {}
            },
            {
                "id": "aws:ecs:drain-container-instances",
                "description": "Drain percentage of underlying EC2 instances on an ECS cluster.",
                "targets": {
                    "Clusters": {
                        "resourceType": "aws:ecs:cluster"
                    }
                },
                "tags": {}
            },
            {
                "id": "aws:eks:terminate-nodegroup-instances",
                "description": "Terminates a percentage of the underlying EC2 instances in an EKS cluster.",
                "targets": {
                    "Nodegroups": {
                        "resourceType": "aws:eks:nodegroup"
                    }
                },
                "tags": {}
            },
            {
                "id": "aws:fis:inject-api-internal-error",
                "description": "Cause an AWS service to return internal error responses for specific callers and operations.",
                "targets": {
                    "Roles": {
                        "resourceType": "aws:iam:role"
                    }
                },
                "tags": {}
            },
            {
                "id": "aws:fis:inject-api-throttle-error",
                "description": "Cause an AWS service to return throttled responses for specific callers and operations.",
                "targets": {
                    "Roles": {
                        "resourceType": "aws:iam:role"
                    }
                },
                "tags": {}
            },
            {
            "id": "aws:fis:inject-api-unavailable-error",
                "description": "Cause an AWS service to return unavailable error responses for specific callers and operations.",
                "targets": {
                    "Roles": {
                        "resourceType": "aws:iam:role"
                    }
                },
                "tags": {}
            },
            {
                "id": "aws:fis:wait",
                "description": "Wait for the specified duration. Stop condition monitoring will continue during this time.",
                "tags": {}
            },
            {
                "id": "aws:rds:failover-db-cluster",
                "description": "Failover a DB Cluster to one of the replicas.",
                "targets": {
                    "Clusters": {
                        "resourceType": "aws:rds:cluster"
                    }
                },
                "tags": {}
            },
            {
                "id": "aws:rds:reboot-db-instances",
                "description": "Reboot the specified DB instances.",
                "targets": {
                    "DBInstances": {
                        "resourceType": "aws:rds:db"
                    }
                },
                "tags": {}
            },
            {
                "id": "aws:ssm:send-command",
                "description": "Run the specified SSM document.",
                "targets": {
                    "Instances": {
                        "resourceType": "aws:ec2:instance"
                    }
                },
                "tags": {}
            }
        ]
    }

For more information, see `Actions <https://docs.aws.amazon.com/fis/latest/userguide/actions.html>`__ in the *AWS Fault Injection Simulator User Guide*.