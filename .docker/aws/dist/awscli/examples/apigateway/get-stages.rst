**To get the list of stages for a REST API**

Command::

  aws apigateway get-stages --rest-api-id 1234123412

Output::

  {
      "item": [
          {
              "stageName": "dev", 
              "cacheClusterSize": "0.5", 
              "cacheClusterEnabled": true, 
              "cacheClusterStatus": "AVAILABLE", 
              "deploymentId": "123h64", 
              "lastUpdatedDate": 1456185138, 
              "createdDate": 1453589092, 
              "methodSettings": {
                  "~1resource~1subresource/POST": {
                      "cacheTtlInSeconds": 300, 
                      "loggingLevel": "INFO", 
                      "dataTraceEnabled": true, 
                      "metricsEnabled": true, 
                      "throttlingRateLimit": 500.0, 
                      "cacheDataEncrypted": false, 
                      "cachingEnabled": false, 
                      "throttlingBurstLimit": 1000
                  }
              }
          }
      ]
  }
