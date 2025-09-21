**To determine whether the registrant contact has responded to a confirmation email**

The following ``get-contact-reachability-status`` command returns information about whether the registrant contact for the specified domain
has responded to a confirmation email. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains get-contact-reachability-status \
        --region us-east-1 \
        --domain-name example.com
  
Output::

    {
        "domainName": "example.com",
        "status": "DONE"
    }

For more information, see `Resending Authorization and Confirmation Emails <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-click-email-link.html>`__ in the *Amazon Route 53 Developer Guide*.
