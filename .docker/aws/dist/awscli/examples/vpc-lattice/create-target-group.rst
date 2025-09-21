**Example 1: To create a target group of type INSTANCE**

The following ``create-target-group`` example creates a target group with the specified name, type, and configuration. ::

    aws vpc-lattice create-target-group \
        --name my-lattice-target-group-instance \
        --type INSTANCE \
        --config file://tg-config.json

Contents of ``tg-config.json``::

    {
        "port": 443,
        "protocol": "HTTPS",
        "protocolVersion": "HTTP1",
        "vpcIdentifier": "vpc-f1663d9868EXAMPLE"
    }

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:targetgroup/tg-0eaa4b9ab4EXAMPLE",
        "config": {
            "healthCheck": {
                "enabled": true,
                "healthCheckIntervalSeconds": 30,
                "healthCheckTimeoutSeconds": 5,
                "healthyThresholdCount": 5,
                "matcher": {
                    "httpCode": "200"
                },
                "path": "/",
                "protocol": "HTTPS",
                "protocolVersion": "HTTP1",
                "unhealthyThresholdCount": 2
            },
            "port": 443,
            "protocol": "HTTPS",
            "protocolVersion": "HTTP1",
            "vpcIdentifier": "vpc-f1663d9868EXAMPLE"
        },
        "id": "tg-0eaa4b9ab4EXAMPLE",
        "name": "my-lattice-target-group-instance",
        "status": "CREATE_IN_PROGRESS",
        "type": "INSTANCE"
    }

**Example 2: To create a target group of type IP**

The following ``create-target-group`` example creates a target group with the specified name, type, and configuration. ::

    aws vpc-lattice create-target-group \
        --name my-lattice-target-group-ip \
        --type IP \
        --config file://tg-config.json

Contents of ``tg-config.json``::

    {
        "ipAddressType": "IPV4",
        "port": 443,
        "protocol": "HTTPS",
        "protocolVersion": "HTTP1",
        "vpcIdentifier": "vpc-f1663d9868EXAMPLE"
    }

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:targetgroup/tg-0eaa4b9ab4EXAMPLE",
        "config": {
            "healthCheck": {
                "enabled": true,
                "healthCheckIntervalSeconds": 30,
                "healthCheckTimeoutSeconds": 5,
                "healthyThresholdCount": 5,
                "matcher": {
                    "httpCode": "200"
                },
                "path": "/",
                "protocol": "HTTPS",
                "protocolVersion": "HTTP1",
                "unhealthyThresholdCount": 2
            },
            "ipAddressType": "IPV4",
            "port": 443,
            "protocol": "HTTPS",
            "protocolVersion": "HTTP1",
            "vpcIdentifier": "vpc-f1663d9868EXAMPLE"
        },
        "id": "tg-0eaa4b9ab4EXAMPLE",
        "name": "my-lattice-target-group-ip",
        "status": "CREATE_IN_PROGRESS",
        "type": "IP"
    }

**Example 3: To create a target group of type LAMBDA**

The following ``create-target-group`` example creates a target group with the specified name, type, and configuration. ::

    aws vpc-lattice create-target-group \
        --name my-lattice-target-group-lambda \
        --type LAMBDA 

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:targetgroup/tg-0eaa4b9ab4EXAMPLE",
        "id": "tg-0eaa4b9ab4EXAMPLE",
        "name": "my-lattice-target-group-lambda",
        "status": "CREATE_IN_PROGRESS",
        "type": "LAMBDA"
    }

**Example 4: To create a target group of type ALB**

The following ``create-target-group`` example creates a target group with the specified name, type, and configuration. ::

    aws vpc-lattice create-target-group \
        --name my-lattice-target-group-alb \
        --type ALB \
        --config file://tg-config.json

Contents of ``tg-config.json``::

    {
        "port": 443,
        "protocol": "HTTPS",
        "protocolVersion": "HTTP1",
        "vpcIdentifier": "vpc-f1663d9868EXAMPLE"
    }

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:targetgroup/tg-0eaa4b9ab4EXAMPLE",
        "config": {
            "port": 443,
            "protocol": "HTTPS",
            "protocolVersion": "HTTP1",
            "vpcIdentifier": "vpc-f1663d9868EXAMPLE"
        },
        "id": "tg-0eaa4b9ab4EXAMPLE",
        "name": "my-lattice-target-group-alb",
        "status": "CREATE_IN_PROGRESS",
        "type": "ALB"
    }

For more information, see `Target groups <https://docs.aws.amazon.com/vpc-lattice/latest/ug/target-groups.html>`__ in the *Amazon VPC Lattice User Guide*.