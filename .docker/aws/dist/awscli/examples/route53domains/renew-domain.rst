**To renew a domain**

The following ``renew-domain`` command renews the specified domain for five years. To get the value for ``current-expiry-year``, use the ``get-domain-detail`` command, and convert the value of ``ExpirationDate`` from Unix format. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains renew-domain \
        --region us-east-1 \
        --domain-name example.com \
        --duration-in-years 5 \
        --current-expiry-year 2020

Output::

    {
        "OperationId": "3f28e0ac-126a-4113-9048-cc930example"
    }

To confirm that the operation succeeded, you can run ``get-operation-detail``. For more information, see `get-operation-detail <https://docs.aws.amazon.com/cli/latest/reference/route53domains/get-operation-detail.html>`__. 

The registry for each top-level domain (TLD), such as .com or .org, controls the maximum number of years that you can renew a domain for. To get the maximum renewal period for your domain, see the "Registration and Renewal Period" section for your TLD in `Domains That You Can Register with Amazon Route 53 <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/registrar-tld-list.html>`__ in the *Amazon Route 53 Developer Guide*.

For more information, see `Renewing Registration for a Domain <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-renew.html>`__ in the *Amazon Route 53 Developer Guide*.
