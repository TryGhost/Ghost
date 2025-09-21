**To delete a routing rule**

The following ``delete-routing-rule`` example deletes a routing rule for a custom domain name. ::

    aws apigatewayv2 delete-routing-rule \
        --domain-name 'regional.example.com' \
        --routing-rule-id aaa111

This command produces no output.

For more information, see `Routing rules to connect API stages to a custom domain name for REST APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-routing-rules.html>`__ in the *Amazon API Gateway Developer Guide*.