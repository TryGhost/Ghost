**To search products with administrator privileges**

The following ``search-products-as-admin`` example searches for products with admin privileges, using a portfolio ID as a filter. ::

    aws servicecatalog search-products-as-admin \
        --portfolio-id port-5abcd3e5st4ei

Output::

    {
        "ProductViewDetails": [
            {
                "ProductViewSummary": {
                    "Name": "my product",
                    "Owner": "owner name",
                    "Type": "CLOUD_FORMATION_TEMPLATE",
                    "ProductId": "prod-abcdfz3syn2rg",
                    "HasDefaultPath": false,
                    "Id": "prodview-abcdmyuzv2dlu",
                    "ShortDescription": "description"
                },
                "ProductARN": "arn:aws:catalog:us-west-2:123456789012:product/prod-abcdfz3syn2rg",
                "CreatedTime": 1562097906.0,
                "Status": "CREATED"
            }
        ]
    }

