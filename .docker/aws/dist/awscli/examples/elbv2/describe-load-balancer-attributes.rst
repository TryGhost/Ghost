**To describe load balancer attributes**

The following ``describe-load-balancer-attributes`` example displays the attributes of the specified load balancer. ::

    aws elbv2 describe-load-balancer-attributes \
        --load-balancer-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188

The following example output show the attributes for an Application Load Balancer. ::

    {
        "Attributes": [
            {
                "Value": "false",
                "Key": "access_logs.s3.enabled"
            },
            {
                "Value": "",
                "Key": "access_logs.s3.bucket"
            },
            {
                "Value": "",
                "Key": "access_logs.s3.prefix"
            },
            {
                "Value": "60",
                "Key": "idle_timeout.timeout_seconds"
            },
            {
                "Value": "false",
                "Key": "deletion_protection.enabled"
            },
            {
                "Value": "true",
                "Key": "routing.http2.enabled"
            }
        ]
    }

The following example output includes the attributes for a Network Load Balancer. ::

    {
        "Attributes": [
            {
                "Value": "false",
                "Key": "access_logs.s3.enabled"
            },
            {
                "Value": "",
                "Key": "access_logs.s3.bucket"
            },
            {
                "Value": "",
                "Key": "access_logs.s3.prefix"
            },
            {
                "Value": "false",
                "Key": "deletion_protection.enabled"
            },
            {
                "Value": "false",
                "Key": "load_balancing.cross_zone.enabled"
            }
        ]
    }
