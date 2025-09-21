**Example 1: To create an application**

The following ``create-app`` example creates a new application (project). ::

    aws pinpoint create-app \
        --create-application-request Name=ExampleCorp 

Output::

    {
        "ApplicationResponse": {
            "Arn": "arn:aws:mobiletargeting:us-west-2:AIDACKCEVSQ6C2EXAMPLE:apps/810c7aab86d42fb2b56c8c966example",
            "Id": "810c7aab86d42fb2b56c8c966example",
            "Name": "ExampleCorp",
            "tags": {}
        }
    }

**Example 2: To create an application that is tagged**

The following ``create-app`` example creates a new application (project) and associates a tag (key and value) with the application. ::

    aws pinpoint create-app \
        --create-application-request Name=ExampleCorp,tags={"Stack"="Test"} 

Output::

    {
        "ApplicationResponse": {
            "Arn": "arn:aws:mobiletargeting:us-west-2:AIDACKCEVSQ6C2EXAMPLE:apps/810c7aab86d42fb2b56c8c966example",
            "Id": "810c7aab86d42fb2b56c8c966example",
            "Name": "ExampleCorp",
            "tags": {
                "Stack": "Test"
            }
        }
    }
