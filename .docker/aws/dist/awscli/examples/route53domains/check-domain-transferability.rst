**To determine whether a domain can be transferred to Route 53**

The following ``check-domain-transferability`` command returns information about whether you can transfer the domain name ``example.com`` to Route 53. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains check-domain-transferability \
        --region us-east-1 \
        --domain-name example.com

Output::

    {
        "Transferability": {
            "Transferable": "UNTRANSFERABLE"
        }
    }

For more information, see `Transferring Registration for a Domain to Amazon Route 53 <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-transfer-to-route-53.html>`__ in the *Amazon Route 53 Developer Guide*.
