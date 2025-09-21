**To list the available services**

The following command lists the services that are available in Service Quotas. ::

    aws service-quotas list-services

Output::

    {
        "Services": [
            {
                "ServiceCode": "AWSCloudMap",
                "ServiceName": "AWS Cloud Map"
            },
            {
                "ServiceCode": "access-analyzer",
                "ServiceName": "Access Analyzer"
            },
            {
                "ServiceCode": "acm",
                "ServiceName": "AWS Certificate Manager (ACM)"
            },     

            ...truncated...

            {
                "ServiceCode": "xray",
                "ServiceName": "AWS X-Ray"
            }
        ]
    }

You can add the ``--query`` parameter to filter the display to the information that you are interested in. The following example displays only the service codes. ::

    aws service-quotas list-services \
        --query Services[*].ServiceCode

Output::

    [
        "AWSCloudMap",
        "access-analyzer",
        "acm",
        "acm-pca",
        "amplify",
        "apigateway",
        "application-autoscaling",
            ...truncated...
        "xray"
    ] 
