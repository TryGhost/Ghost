**To get a list of suggested domain names**

The following ``get-domain-suggestions`` command displays a list of suggested domain names based on the domain name ``example.com``. The response includes only domain names that are available. 
This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains get-domain-suggestions \
        --region us-east-1 \
        --domain-name example.com \
        --suggestion-count 10 \
        --only-available

Output::

    {
        "SuggestionsList": [
            {
                "DomainName": "egzaampal.com",
                "Availability": "AVAILABLE"
            },
            {
                "DomainName": "examplelaw.com",
                "Availability": "AVAILABLE"
            },
            {
                "DomainName": "examplehouse.net",
                "Availability": "AVAILABLE"
            },
            {
                "DomainName": "homeexample.net",
                "Availability": "AVAILABLE"
            },
            {
                "DomainName": "examplelist.com",
                "Availability": "AVAILABLE"
           },
            {
                "DomainName": "examplenews.net",
                "Availability": "AVAILABLE"
            },
            {
                "DomainName": "officeexample.com",
                "Availability": "AVAILABLE"
            },
            {
                "DomainName": "exampleworld.com",
                "Availability": "AVAILABLE"
            },
            {
                "DomainName": "exampleart.com",
                "Availability": "AVAILABLE"
            }
        ]
    }
