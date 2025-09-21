**To request a new ACM certificate**

The following ``request-certificate`` command requests a new certificate for the www.example.com domain using DNS validation::

  aws acm request-certificate --domain-name www.example.com --validation-method DNS  

You can enter an idempotency token to distinguish between calls to ``request-certificate``::

  aws acm request-certificate --domain-name www.example.com --validation-method DNS --idempotency-token 91adc45q

You can enter one or more subject alternative names to request a certificate that will protect more than one apex domain::

  aws acm request-certificate --domain-name example.com --validation-method DNS --idempotency-token 91adc45q --subject-alternative-names www.example.net
  
You can enter an alternative name that can also be used to reach your website::
  
  aws acm request-certificate --domain-name example.com --validation-method DNS --idempotency-token 91adc45q --subject-alternative-names www.example.com
  
You can use an asterisk (*) as a wildcard to create a certificate for several subdomains in the same domain::

  aws acm request-certificate --domain-name example.com --validation-method DNS --idempotency-token 91adc45q --subject-alternative-names *.example.com

You can also enter multiple alternative names::

  aws acm request-certificate --domain-name example.com --validation-method DNS --subject-alternative-names b.example.com c.example.com d.example.com 

If you are using email for validation, you can enter domain validation options to specify the domain to which the validation email will be sent::

  aws acm request-certificate --domain-name example.com --validation-method EMAIL --subject-alternative-names www.example.com --domain-validation-options DomainName=example.com,ValidationDomain=example.com
  
The following command opts out of certificate transparency logging when you request a new certificate::

  aws acm request-certificate --domain-name www.example.com --validation-method DNS --options CertificateTransparencyLoggingPreference=DISABLED --idempotency-token 184627
