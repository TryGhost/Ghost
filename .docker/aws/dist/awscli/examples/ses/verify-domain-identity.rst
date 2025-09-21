**To verify a domain with Amazon SES**

The following example uses the ``verify-domain-identity`` command to verify a domain::

    aws ses verify-domain-identity --domain example.com

Output::

 {
    "VerificationToken": "eoEmxw+YaYhb3h3iVJHuXMJXqeu1q1/wwmvjuEXAMPLE"
 }


To complete domain verification, you must add a TXT record with the returned verification token to your domain's DNS settings. For more information, see `Verifying Domains in Amazon SES`_ in the *Amazon Simple Email Service Developer Guide*.

.. _`Verifying Domains in Amazon SES`: http://docs.aws.amazon.com/ses/latest/DeveloperGuide/verify-domains.html
