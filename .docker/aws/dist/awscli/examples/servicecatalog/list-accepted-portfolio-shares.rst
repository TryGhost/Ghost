**To list accepted portfolio shares**

The following ``list-accepted-portfolio-shares`` example lists all portfolios for which sharing was accepted by this account, including only the default Service Catalog portfolios. ::

    aws servicecatalog list-accepted-portfolio-shares \
        --portfolio-share-type "AWS_SERVICECATALOG"

Output::

    {
        "PortfolioDetails": [
            {
                "ARN": "arn:aws:catalog:us-west-2:123456789012:portfolio/port-d2abcd5dpkuma",
                "Description": "AWS Service Catalog Reference blueprints for often-used AWS services such as EC2, S3, RDS, VPC and EMR.",
                "CreatedTime": 1574456190.687,
                "ProviderName": "AWS Service Catalog",
                "DisplayName": "Reference Architectures",
                "Id": "port-d2abcd5dpkuma"
            },
            {
                "ARN": "arn:aws:catalog:us-west-2:123456789012:portfolio/port-abcdefaua7zpu",
                "Description": "AWS well-architected blueprints for high reliability applications.",
                "CreatedTime": 1574461496.092,
                "ProviderName": "AWS Service Catalog",
                "DisplayName": "High Reliability Architectures",
                "Id": "port-abcdefaua7zpu"
            }
        ]
    }
