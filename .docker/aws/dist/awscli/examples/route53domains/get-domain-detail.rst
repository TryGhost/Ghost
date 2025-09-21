**To get detailed information about a specified domain**

The following ``get-domain-detail`` command displays detailed information about the specified domain. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains get-domain-detail \
        --region us-east-1 \
        --domain-name example.com

Output::

    {
        "DomainName": "example.com",
        "Nameservers": [
            {
                "Name": "ns-2048.awsdns-64.com",
                "GlueIps": []
            },
            {
                "Name": "ns-2049.awsdns-65.net",
                "GlueIps": []
            },
            {
                "Name": "ns-2050.awsdns-66.org",
                "GlueIps": []
            },
            {
                "Name": "ns-2051.awsdns-67.co.uk",
                "GlueIps": []
            }
        ],
        "AutoRenew": true,
        "AdminContact": {
            "FirstName": "Saanvi",
            "LastName": "Sarkar",
            "ContactType": "COMPANY",
            "OrganizationName": "Example",
            "AddressLine1": "123 Main Street",
            "City": "Anytown",
            "State": "WA",
            "CountryCode": "US",
            "ZipCode": "98101",
            "PhoneNumber": "+1.8005551212",
            "Email": "ssarkar@example.com",
            "ExtraParams": []
        },
        "RegistrantContact": {
            "FirstName": "Alejandro",
            "LastName": "Rosalez",
            "ContactType": "COMPANY",
            "OrganizationName": "Example",
            "AddressLine1": "123 Main Street",
            "City": "Anytown",
            "State": "WA",
            "CountryCode": "US",
            "ZipCode": "98101",
            "PhoneNumber": "+1.8005551212",
            "Email": "arosalez@example.com",
            "ExtraParams": []
        },
        "TechContact": {
            "FirstName": "Wang",
            "LastName": "Xiulan",
            "ContactType": "COMPANY",
            "OrganizationName": "Example",
            "AddressLine1": "123 Main Street",
            "City": "Anytown",
            "State": "WA",
            "CountryCode": "US",
            "ZipCode": "98101",
            "PhoneNumber": "+1.8005551212",
            "Email": "wxiulan@example.com",
            "ExtraParams": []
        },
        "AdminPrivacy": true,
        "RegistrantPrivacy": true,
        "TechPrivacy": true,
        "RegistrarName": "Amazon Registrar, Inc.",
        "WhoIsServer": "whois.registrar.amazon",
        "RegistrarUrl": "http://registrar.amazon.com",
        "AbuseContactEmail": "abuse@registrar.amazon.com",
        "AbuseContactPhone": "+1.2062661000",
        "CreationDate": 1444934889.601,
        "ExpirationDate": 1602787689.0,
        "StatusList": [
            "clientTransferProhibited"
        ]
    }