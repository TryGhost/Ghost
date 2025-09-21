**To import domains into a domain list**

The following ``import-firewall-domains`` example imports a set of domains from a file into a DNS Firewall domain list that you specify. ::

    aws route53resolver import-firewall-domains \
        --firewall-domain-list-id rslvr-fdl-d61cbb2cbexample \
        --operation REPLACE \
        --domain-file-url s3://PATH/TO/YOUR/FILE

Output::

    {
        "Id": "rslvr-fdl-d61cbb2cbexample",
        "Name": "test",
        "Status": "IMPORTING",
        "StatusMessage": "Importing domains from provided file."
    }

For more information, see `Managing your own domain lists <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-user-managed-domain-lists.html>`__ in the *Amazon Route 53 Developer Guide*.