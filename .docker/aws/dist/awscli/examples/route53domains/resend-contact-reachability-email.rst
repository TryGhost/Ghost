**To resend the confirmation email to the current email address for the registrant contact**

The following ``resend-contact-reachability-email`` command resends the confirmation email to the current email address for the registrant contact for the example.com domain. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains resend-contact-reachability-email \
        --region us-east-1 \
        --domain-name example.com

Output::

    {
        "domainName": "example.com",
        "emailAddress": "moliveira@example.com",
        "isAlreadyVerified": true
    }

If the value of ``isAlreadyVerified`` is ``true``, as in this example, the registrant contact has already confirmed that the specified email address is reachable.

For more information, see `Resending Authorization and Confirmation Emails <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-click-email-link.html>`__ in the *Amazon Route 53 Developer Guide*.