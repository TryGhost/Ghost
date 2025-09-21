**To describe a portfolio**

The following ``describe-portfolio`` example displays details for the specified portfolio. ::

    aws servicecatalog describe-portfolio \
        --id port-2s6abcdq5wdh4

Output::

    {
        "TagOptions": [],
        "PortfolioDetail": {
            "ARN": "arn:aws:catalog:us-west-2:687558541234:portfolio/port-2s6abcdq5wdh4",
            "Id": "port-2s6wuzyq5wdh4",
            "CreatedTime": 1571337221.555,
            "DisplayName": "my-portfolio",
            "ProviderName": "my-provider"
        },
        "Tags": []
    }
