**To change the base path for a custom domain name**

Command::

  aws apigateway update-base-path-mapping --domain-name api.domain.tld --base-path prod --patch-operations op='replace',path='/basePath',value='v1'

Output::

  {
      "basePath": "v1", 
      "restApiId": "1234123412", 
      "stage": "api"
  }
