**To transfer a domain to Amazon Route 53**

The following ``transfer-domain`` command transfers a domain to Route 53, with the parameters provided by the JSON-formatted file ``C:\temp\transfer-domain.json``. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains transfer-domain \
        --region us-east-1 \
        --cli-input-json file://C:\temp\transfer-domain.json

Contents of ``transfer-domain.json``::

    {
        "DomainName": "example.com",
        "DurationInYears": 1,
        "Nameservers": [
            {
                "Name": "ns-2048.awsdns-64.com"
            },
            {
                "Name": "ns-2049.awsdns-65.net"
            },
            {
                "Name": "ns-2050.awsdns-66.org"
            },
            {
                "Name": "ns-2051.awsdns-67.co.uk"
            }
        ],
        "AuthCode": ")o!v3dJeXampLe",
        "AutoRenew": true,
        "AdminContact": {
            "FirstName": "Martha",
            "LastName": "Rivera",
            "ContactType": "PERSON",
            "OrganizationName": "Example",
            "AddressLine1": "1 Main Street",
            "City": "Anytown",
            "State": "WA",
            "CountryCode": "US",
            "ZipCode": "98101",
            "PhoneNumber": "+1.8005551212",
            "Email": "mrivera@example.com"
        },
        "RegistrantContact": {
            "FirstName": "Li",
            "LastName": "Juan",
            "ContactType": "PERSON",
            "OrganizationName": "Example",
            "AddressLine1": "1 Main Street",
            "City": "Anytown",
            "State": "WA",
            "CountryCode": "US",
            "ZipCode": "98101",
            "PhoneNumber": "+1.8005551212",
            "Email": "ljuan@example.com"
        },
        "TechContact": {
            "FirstName": "Mateo",
            "LastName": "Jackson",
            "ContactType": "PERSON",
            "OrganizationName": "Example",
            "AddressLine1": "1 Main Street",
            "City": "Anytown",
            "State": "WA",
            "CountryCode": "US",
            "ZipCode": "98101",
            "PhoneNumber": "+1.8005551212",
            "Email": "mjackson@example.com"
        },
        "PrivacyProtectAdminContact": true,
        "PrivacyProtectRegistrantContact": true,
        "PrivacyProtectTechContact": true
    }

Output::

    {
        "OperationId": "b114c44a-9330-47d1-a6e8-a0b11example"
    }

To confirm that the operation succeeded, you can run ``get-operation-detail``. For more information, see `get-operation-detail <https://docs.aws.amazon.com/cli/latest/reference/route53domains/get-operation-detail.html>`__ .

For more information, see `Transferring Registration for a Domain to Amazon Route 53 <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-transfer-to-route-53.html>`__ in the *Amazon Route 53 Developer Guide*.