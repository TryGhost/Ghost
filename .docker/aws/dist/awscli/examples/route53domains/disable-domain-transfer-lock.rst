**To disable the transfer lock on a domain**

The following ``disable-domain-transfer-lock`` command removes the transfer lock on the domain ``example.com`` so that the domain can be transferred to another registrar. This command changes the ``clientTransferProhibited`` status. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains disable-domain-transfer-lock \
        --region us-east-1 \
        --domain-name example.com

Output::

    {
        "OperationId": "3f28e0ac-126a-4113-9048-cc930example"
    }

To confirm that the transfer lock has been changed, you can run `get-domain-detail <https://docs.aws.amazon.com/cli/latest/reference/route53domains/get-domain-detail.html>`__ . When the transfer lock is disabled, the value of ``StatusList`` does *not* include ``clientTransferProhibited``.

For more information about the transfer process, see `Transferring a Domain from Amazon Route 53 to Another Registrar <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-transfer-from-route-53.html>`__ in the *Amazon Route 53 Developer Guide*.
