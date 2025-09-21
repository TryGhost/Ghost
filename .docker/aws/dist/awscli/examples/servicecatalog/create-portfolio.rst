**To create a portfolio**

The following ``create-portfolio`` example creates a portfolio. ::

    aws servicecatalog create-portfolio  \
        --provider-name my-provider \
        --display-name my-portfolio

Output::

    {
        "PortfolioDetail": {
            "ProviderName": "my-provider",
            "DisplayName": "my-portfolio",
            "CreatedTime": 1571337221.555,
            "ARN": "arn:aws:catalog:us-east-2:123456789012:portfolio/port-2s6xmplq5wdh4",
            "Id": "port-2s6xmplq5wdh4"
        }
    }
