**To get information about an API's stage**

Command::

  aws apigateway get-stage --rest-api-id 1234123412 --stage-name dev

Output::

  {
      "stageName": "dev", 
      "cacheClusterSize": "0.5", 
      "cacheClusterEnabled": false, 
      "cacheClusterStatus": "NOT_AVAILABLE", 
      "deploymentId": "rbh1fj", 
      "lastUpdatedDate": 1466802961, 
      "createdDate": 1460682074, 
      "methodSettings": {
          "*/*": {
              "cacheTtlInSeconds": 300, 
              "loggingLevel": "INFO", 
              "dataTraceEnabled": false, 
              "metricsEnabled": true, 
              "unauthorizedCacheControlHeaderStrategy": "SUCCEED_WITH_RESPONSE_HEADER", 
              "throttlingRateLimit": 500.0, 
              "cacheDataEncrypted": false, 
              "cachingEnabled": false, 
              "throttlingBurstLimit": 1000, 
              "requireAuthorizationForCacheControl": true
          }, 
          "~1resource/GET": {
              "cacheTtlInSeconds": 300, 
              "loggingLevel": "INFO", 
              "dataTraceEnabled": false, 
              "metricsEnabled": true, 
              "unauthorizedCacheControlHeaderStrategy": "SUCCEED_WITH_RESPONSE_HEADER", 
              "throttlingRateLimit": 500.0, 
              "cacheDataEncrypted": false, 
              "cachingEnabled": false, 
              "throttlingBurstLimit": 1000, 
              "requireAuthorizationForCacheControl": true
          }
      }
  }
