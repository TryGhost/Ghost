**To get billing information for domain registration charges for the current AWS account**

The following ``view-billing`` command returns all the domain-related billing records for the current account for the period from January 1, 2018 (1514764800 in Unix time) and midnight on December 31, 2019 (1577836800 in Unix time). 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains view-billing \
        --region us-east-1 \
        --start-time 1514764800 \
        --end-time 1577836800

Output::

    {
        "BillingRecords": [
            {
                "DomainName": "example.com",
                "Operation": "RENEW_DOMAIN",
                "InvoiceId": "149962827",
                "BillDate": 1536618063.181,
                "Price": 12.0
            },
            {
                "DomainName": "example.com",
                "Operation": "RENEW_DOMAIN",
                "InvoiceId": "290913289",
                "BillDate": 1568162630.884,
                "Price": 12.0
            }
        ]
    }

For more information, see `ViewBilling <https://docs.aws.amazon.com/Route53/latest/APIReference/API_domains_ViewBilling.html>`__ in the *Amazon Route 53 API Reference*.