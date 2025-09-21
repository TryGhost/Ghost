**To get a routing rule**

The following ``get-routing-rule`` example gets a routing rule for a domain name. ::

    aws apigatewayv2 get-routing-rule \
        --domain-name 'regional.example.com' \
        --routing-rule-id aaa111

Output::

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
        "Priority": 50,
        "RoutingRuleArn": "arn:aws:apigateway:us-east-2:123456789012:/domainnames/regional.example.com/routingrules/aaa111",
        "RoutingRuleId": "aaa111"
    }

For more information, see `Routing rules to connect API stages to a custom domain name for REST APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-routing-rules.html>`__ in the *Amazon API Gateway Developer Guide*.