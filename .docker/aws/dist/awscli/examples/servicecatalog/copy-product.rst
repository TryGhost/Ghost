**To copy a product**

The following ``copy-product`` example makes a copy of the specified product, using a JSON file to pass parameters. ::

    aws servicecatalog copy-product --cli-input-json file://copy-product-input.json

Contents of ``copy-product-input.json``::

    {
        "SourceProductArn": "arn:aws:catalog:us-west-2:123456789012:product/prod-tcabcd3syn2xy",
        "TargetProductName": "copy-of-myproduct",
        "CopyOptions": [
            "CopyTags"
        ]
    }

Output::

    {
        "CopyProductToken": "copyproduct-abc5defgjkdji"
    }

