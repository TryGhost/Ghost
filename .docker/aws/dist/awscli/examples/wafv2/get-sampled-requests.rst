**To retrieve a sample of web requests for a web ACL**

The following ``get-sampled-requests`` retrieves the sampled web requests for the specified web ACL, rule metric, and time frame. ::

    aws wafv2 get-sampled-requests \
        --web-acl-arn arn:aws:wafv2:us-west-2:123456789012:regional/webacl/test-cli/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \ 
        --rule-metric-name AWS-AWSManagedRulesSQLiRuleSet \
        --scope=REGIONAL \
        --time-window StartTime=2020-02-12T20:00Z,EndTime=2020-02-12T21:10Z \
        --max-items 100 

Output::

    {
        "TimeWindow": {
        "EndTime": 1581541800.0,
        "StartTime": 1581537600.0
        },
        "SampledRequests": [
            {
                "Action": "BLOCK",
                "Timestamp": 1581541799.564,
                "RuleNameWithinRuleGroup": "AWS#AWSManagedRulesSQLiRuleSet#SQLi_BODY",
                "Request": {
                    "Country": "US",
                    "URI": "/",
                    "Headers": [
                        {
                            "Name": "Host",
                            "Value": "alb-test-1EXAMPLE1.us-east-1.elb.amazonaws.com"
                        },
                        {
                            "Name": "Content-Length",
                            "Value": "7456"
                        },
                        {
                            "Name": "User-Agent",
                            "Value": "curl/7.53.1"
                        },
                        {
                            "Name": "Accept",
                            "Value": "/"
                        },
                        {
                            "Name": "Content-Type",
                            "Value": "application/x-www-form-urlencoded"
                        }
                    ],
                    "ClientIP": "198.51.100.08",
                    "Method": "POST",
                    "HTTPVersion": "HTTP/1.1"
                },
                "Weight": 1
            },
            {
                "Action": "BLOCK",
                "Timestamp": 1581541799.988,
                "RuleNameWithinRuleGroup": "AWS#AWSManagedRulesSQLiRuleSet#SQLi_BODY",
                "Request": {
                    "Country": "US",
                    "URI": "/",
                    "Headers": [
                        {
                            "Name": "Host",
                            "Value": "alb-test-1EXAMPLE1.us-east-1.elb.amazonaws.com"
                        },
                        {
                            "Name": "Content-Length",
                            "Value": "7456"
                        },
                        {
                            "Name": "User-Agent",
                            "Value": "curl/7.53.1"
                        },
                        {
                            "Name": "Accept",
                            "Value": "/"
                        },
                        {
                            "Name": "Content-Type",
                            "Value": "application/x-www-form-urlencoded"
                        }
                    ],
                    "ClientIP": "198.51.100.08",
                    "Method": "POST",
                    "HTTPVersion": "HTTP/1.1"
                },
                "Weight": 3
            },
            {
                "Action": "BLOCK",
                "Timestamp": 1581541799.846,
                "RuleNameWithinRuleGroup": "AWS#AWSManagedRulesSQLiRuleSet#SQLi_BODY",
                "Request": {
                    "Country": "US",
                    "URI": "/",
                    "Headers": [
                        {
                            "Name": "Host",
                            "Value": "alb-test-1EXAMPLE1.us-east-1.elb.amazonaws.com"
                        },
                        {
                            "Name": "Content-Length",
                            "Value": "7456"
                        },
                        {
                            "Name": "User-Agent",
                            "Value": "curl/7.53.1"
                        },
                        {
                            "Name": "Accept",
                            "Value": "/"
                        },
                        {
                            "Name": "Content-Type",
                            "Value": "application/x-www-form-urlencoded"
                        }
                    ],
                    "ClientIP": "198.51.100.08",
                    "Method": "POST",
                    "HTTPVersion": "HTTP/1.1"
                },
                "Weight": 1
            },
            {
                "Action": "BLOCK",
                "Timestamp": 1581541799.4,
                "RuleNameWithinRuleGroup": "AWS#AWSManagedRulesSQLiRuleSet#SQLi_BODY",
                "Request": {
                    "Country": "US",
                    "URI": "/",
                    "Headers": [
                        {
                            "Name": "Host",
                            "Value": "alb-test-1EXAMPLE1.us-east-1.elb.amazonaws.com"
                        },
                        {
                            "Name": "Content-Length",
                            "Value": "7456"
                        },
                        {
                            "Name": "User-Agent",
                            "Value": "curl/7.53.1"
                        },
                        {
                            "Name": "Accept",
                            "Value": "/"
                        },
                        {
                            "Name": "Content-Type",
                            "Value": "application/x-www-form-urlencoded"
                        }
                    ],
                    "ClientIP": "198.51.100.08",
                    "Method": "POST",
                    "HTTPVersion": "HTTP/1.1"
                },
                "Weight": 1
            }
        ],
        "PopulationSize": 4
    }

For more information, see `Viewing a Sample of Web Requests <https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-testing.html#web-acl-testing-view-sample>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.