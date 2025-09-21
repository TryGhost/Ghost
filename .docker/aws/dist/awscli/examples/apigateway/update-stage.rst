**Example 1: To override the stage settings for a resource and method**

The following ``update-stage`` example overrides the stage settings and turns off full request/response logging for a specific resource and method. ::

    aws apigateway update-stage \
        --rest-api-id 1234123412 \
        --stage-name 'dev' \
        --patch-operations op=replace,path=/~1resourceName/GET/logging/dataTrace,value=false

Output::

    {
        "deploymentId": "5ubd17",
        "stageName": "dev",
        "cacheClusterEnabled": false,
        "cacheClusterStatus": "NOT_AVAILABLE",
        "methodSettings": {
            "~1resourceName/GET": {
                "metricsEnabled": false,
                "dataTraceEnabled": false,
                "throttlingBurstLimit": 5000,
                "throttlingRateLimit": 10000.0,
                "cachingEnabled": false,
                "cacheTtlInSeconds": 300,
                "cacheDataEncrypted": false,
                "requireAuthorizationForCacheControl": true,
                "unauthorizedCacheControlHeaderStrategy": "SUCCEED_WITH_RESPONSE_HEADER"
            }
        },
        "tracingEnabled": false,
        "createdDate": "2022-07-18T10:11:18-07:00",
        "lastUpdatedDate": "2022-07-18T10:19:04-07:00"
    }

For more information, see `Setting up a stage for a REST API <https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-stages.html>`__ in the *Amazon API Gateway Developer Guide*.

**Example 2: To update the stage settings for all resources and methods of an API stage**

The following ``update-stage`` example turns on full request/response logging for all resources and methods of an API stage. ::

    aws apigateway update-stage \
        --rest-api-id 1234123412 \
        --stage-name 'dev' \
        --patch-operations 'op=replace,path=/*/*/logging/dataTrace,value=true'

Output::

    {
        "deploymentId": "5ubd17",
        "stageName": "dev",
        "cacheClusterEnabled": false,
        "cacheClusterStatus": "NOT_AVAILABLE",
        "methodSettings": {
            "*/*": {
                "metricsEnabled": false,
                "dataTraceEnabled": true,
                "throttlingBurstLimit": 5000,
                "throttlingRateLimit": 10000.0,
                "cachingEnabled": false,
                "cacheTtlInSeconds": 300,
                "cacheDataEncrypted": false,
                "requireAuthorizationForCacheControl": true,
                "unauthorizedCacheControlHeaderStrategy": "SUCCEED_WITH_RESPONSE_HEADER"
            }
        },
        "tracingEnabled": false,
        "createdDate": "2022-07-18T10:11:18-07:00",
        "lastUpdatedDate": "2022-07-18T10:31:04-07:00"
    }

For more information, see `Setting up a stage for a REST API <https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-stages.html>`__ in the *Amazon API Gateway Developer Guide*.