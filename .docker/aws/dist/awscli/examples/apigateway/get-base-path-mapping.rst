**To get the base path mapping for a custom domain name**

Command::

  aws apigateway get-base-path-mapping --domain-name subdomain.domain.tld --base-path v1

Output::

  {
      "basePath": "v1", 
      "restApiId": "1234w4321e", 
      "stage": "api"
  }
