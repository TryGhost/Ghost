**To delete an application**

The following ``delete-app`` example deletes an application (project). ::

    aws pinpoint delete-app \
        --application-id 810c7aab86d42fb2b56c8c966example 

Output::

    {
        "ApplicationResponse": {
            "Arn": "arn:aws:mobiletargeting:us-west-2:AIDACKCEVSQ6C2EXAMPLE:apps/810c7aab86d42fb2b56c8c966example",
            "Id": "810c7aab86d42fb2b56c8c966example",
            "Name": "ExampleCorp",
            "tags": {}
        }
    }
