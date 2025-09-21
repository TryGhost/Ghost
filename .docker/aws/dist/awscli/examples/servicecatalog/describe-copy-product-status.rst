**To describe the status of the copy product operation**

The following ``describe-copy-product-status`` example displays the current status of the specified asynchronous copy product operation. ::

    aws servicecatalog describe-copy-product-status \
        --copy-product-token copyproduct-znn5tf5abcd3w

Output::

    {
        "CopyProductStatus": "SUCCEEDED",
        "TargetProductId": "prod-os6hog7abcdt2"
    }
