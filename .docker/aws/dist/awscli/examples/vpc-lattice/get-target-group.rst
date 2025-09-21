**To get information about a target group**

The following ``get-target-group`` example gets information about the specified target group, which has a target type of ``INSTANCE``. ::

    aws vpc-lattice get-target-group \
        --target-group-identifier tg-0eaa4b9ab4EXAMPLE

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
        "createdAt": "2023-05-06T04:41:04.122Z",
        "id": "tg-0eaa4b9ab4EXAMPLE",
        "lastUpdatedAt": "2023-05-06T04:41:04.122Z",
        "name": "my-target-group",
        "serviceArns": [
            "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE"
        ],
        "status": "ACTIVE",
        "type": "INSTANCE"
    }

For more information, see `Target groups <https://docs.aws.amazon.com/vpc-lattice/latest/ug/target-groups.html>`__ in the *Amazon VPC Lattice User Guide*.