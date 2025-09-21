**To describe your Elastic Load Balancing limits**

The following ``describe-account-limits`` example displays the Elastic Load Balancing limits for your AWS account in the current Region. ::

    aws elbv2 describe-account-limits

Output::

    {
        "Limits": [
            {
                "Name": "target-groups",
                "Max": "3000"
            },
            {
                "Name": "targets-per-application-load-balancer",
                "Max": "1000"
            },
            {
                "Name": "listeners-per-application-load-balancer",
                "Max": "50"
            },
            {
                "Name": "rules-per-application-load-balancer",
                "Max": "100"
            },
            {
                "Name": "network-load-balancers",
                "Max": "50"
            },
            {
                "Name": "targets-per-network-load-balancer",
                "Max": "3000"
            },
            {
                "Name": "targets-per-availability-zone-per-network-load-balancer",
                "Max": "500"
            },
            {
                "Name": "listeners-per-network-load-balancer",
                "Max": "50"
            },
            {
                "Name": "condition-values-per-alb-rule",
                "Max": "5"
            },
            {
                "Name": "condition-wildcards-per-alb-rule",
                "Max": "5"
            },
            {
                "Name": "target-groups-per-application-load-balancer",
                "Max": "100"
            },
            {
                "Name": "target-groups-per-action-on-application-load-balancer",
                "Max": "5"
            },
            {
                "Name": "target-groups-per-action-on-network-load-balancer",
                "Max": "1"
            },
            {
                "Name": "certificates-per-application-load-balancer",
                "Max": "25"
            },
            {
                "Name": "certificates-per-network-load-balancer",
                "Max": "25"
            },
            {
                "Name": "targets-per-target-group",
                "Max": "1000"
            },
            {
                "Name": "target-id-registrations-per-application-load-balancer",
                "Max": "1000"
            },
            {
                "Name": "network-load-balancer-enis-per-vpc",
                "Max": "1200"
            },
            {
                "Name": "application-load-balancers",
                "Max": "50"
            },
            {
                "Name": "gateway-load-balancers",
                "Max": "100"
            },
            {
                "Name": "gateway-load-balancers-per-vpc",
                "Max": "100"
            },
            {
                "Name": "geneve-target-groups",
                "Max": "100"
            },
            {
                "Name": "targets-per-availability-zone-per-gateway-load-balancer",
                "Max": "300"
            }
        ]
    }

For more information, see `Quotas <https://docs.aws.amazon.com/general/latest/gr/elb.html#limits_elastic_load_balancer>`__ in the *AWS General Reference*.