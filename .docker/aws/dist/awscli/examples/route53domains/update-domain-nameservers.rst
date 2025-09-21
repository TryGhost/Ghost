**To update the name servers for a domain**

The following ``update-domain-nameservers`` command updates the name servers for a domain. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains update-domain-nameservers \
        --region us-east-1 \
        --domain-name example.com \
        --nameservers Name=ns-1.awsdns-01.org Name=ns-2.awsdns-02.co.uk Name=ns-3.awsdns-03.net Name=ns-4.awsdns-04.com

Output::

    {
        "OperationId": "f1691ec4-0e7a-489e-82e0-b19d3example"
    }

To confirm that the operation succeeded, you can run `get-domain-detail <https://docs.aws.amazon.com/cli/latest/reference/route53domains/get-domain-detail.html>`__ .

For more information, see `Adding or Changing Name Servers and Glue Records for a Domain <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-name-servers-glue-records.html>`__ in the *Amazon Route 53 Developer Guide*.
