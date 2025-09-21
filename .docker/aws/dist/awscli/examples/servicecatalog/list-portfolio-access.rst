**To list accounts with access to a portfolio**

The following ``list-portfolio-access`` example lists the AWS accounts that have access to the specified portfolio. ::

    aws servicecatalog list-portfolio-access \
        --portfolio-id port-2s6abcdq5wdh4

Output::

    {
        "AccountIds": [
            "123456789012"
        ]
    }
