**To retrieve information about an application (project)**

The following ``get-app`` example retrieves information about an application (project). ::

    aws pinpoint get-app \
        --application-id 810c7aab86d42fb2b56c8c966example \
        --region us-east-1

Output::

    {
        "ApplicationResponse": {
            "Arn": "arn:aws:mobiletargeting:us-east-1:AIDACKCEVSQ6C2EXAMPLE:apps/810c7aab86d42fb2b56c8c966example",
            "Id": "810c7aab86d42fb2b56c8c966example",
            "Name": "ExampleCorp",
            "tags": {
                    "Year": "2019",
                    "Stack": "Production"
                }
        }
    }