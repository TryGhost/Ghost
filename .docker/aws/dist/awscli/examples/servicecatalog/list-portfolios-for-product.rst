**To list portfolios associated with a product**

The following ``list-portfolios-for-product`` example lists the portfolios associated with the specified product. ::

    aws servicecatalog list-portfolios-for-product \
        --product-id prod-abcdfz3syn2rg

Output::

    {
        "PortfolioDetails": [
            {
                "CreatedTime": 1571337221.555,
                "Id": "port-2s6abcdq5wdh4",
                "ARN": "arn:aws:catalog:us-west-2:123456789012:portfolio/port-2s6abcdq5wdh4",
                "DisplayName": "my-portfolio",
                "ProviderName": "my-provider"
            },
            {
                "CreatedTime": 1559665256.348,
                "Id": "port-5abcd3e5st4ei",
                "ARN": "arn:aws:catalog:us-west-2:123456789012:portfolio/port-5abcd3e5st4ei",
                "DisplayName": "test",
                "ProviderName": "provider-name"
            }
        ]
    }
