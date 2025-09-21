**To list all principals for a portfolio**

The following ``list-principals-for-portfolio`` example lists all principals for the specified portfolio. ::

    aws servicecatalog list-principals-for-portfolio \
        --portfolio-id port-2s6abcdq5wdh4

Output::

    {
        "Principals": [
            {
                "PrincipalARN": "arn:aws:iam::123456789012:user/usertest",
                "PrincipalType": "IAM"
            }
        ]
    }
