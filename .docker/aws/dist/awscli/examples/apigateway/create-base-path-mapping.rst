**To create the base path mapping for a custom domain name**

Command::

  aws apigateway create-base-path-mapping --domain-name subdomain.domain.tld --rest-api-id 1234123412 --stage prod --base-path v1
