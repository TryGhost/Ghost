**To get the base path mappings for a custom domain name**

Command::

  aws apigateway get-base-path-mappings --domain-name subdomain.domain.tld

Output::

  {
      "items": [
          {
              "basePath": "(none)", 
              "restApiId": "1234w4321e", 
              "stage": "dev"
          }, 
          {
              "basePath": "v1", 
              "restApiId": "1234w4321e", 
              "stage": "api"
          }
      ]
  }
