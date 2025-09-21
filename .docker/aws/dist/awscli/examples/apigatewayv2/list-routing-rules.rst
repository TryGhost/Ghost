**To list routing rules**

The following ``list-routing-rules`` example lists the routing rules for a domain name. ::

    aws apigatewayv2 list-routing-rules \
        --domain-name 'regional.example.com'

Output::

    {
        "RoutingRules": [
            {
                "Actions": [
                    {
                        "InvokeApi": {
                            "ApiId": "abcd1234",
                            "Stage": "prod",
                            "StripBasePath": false
                        }
                    }
                ],
                "Conditions": [
                    {
                        "MatchBasePaths": {
                            "AnyOf": [
                                "PetStoreShopper"
                            ]
                        }
                    }
                ],
                "Priority": 150,
                "RoutingRuleArn": "arn:aws:apigateway:us-east-1:123456789012:/domainnames/regional.example.com/routingrules/aaa111",
                "RoutingRuleId": "aaa111"
            }
        ]
    }

For more information, see `Routing rules to connect API stages to a custom domain name for REST APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-routing-rules.html>`__ in the *Amazon API Gateway Developer Guide*.