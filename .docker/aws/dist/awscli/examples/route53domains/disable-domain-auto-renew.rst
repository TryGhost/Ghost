**To disable automatic renewal of a domain**

The following ``disable-domain-auto-renew`` command configures Route 53 to *not* automatically renew the domain ``example.com`` before registration for the domain expires. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains disable-domain-auto-renew \
        --region us-east-1 \
        --domain-name example.com

This command produces no output. 

To confirm that the setting was changed, you can run `get-domain-detail <https://docs.aws.amazon.com/cli/latest/reference/route53domains/get-domain-detail.html>`__ . If automatic renewal is disabled, the value of ``AutoRenew`` is ``False``. 
For more information about automatic renewal, see `Renewing Registration for a Domain <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-renew.html`__ in the *Amazon Route 53 Developer Guide*.
