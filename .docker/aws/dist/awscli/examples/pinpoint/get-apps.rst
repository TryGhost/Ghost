**To retrieve information about all of your applications**

The following ``get-apps`` example retrieves information about all of your applications (projects). ::

    aws pinpoint get-apps

Output::

    {
        "ApplicationsResponse": {
            "Item": [
                {
                    "Arn": "arn:aws:mobiletargeting:us-west-2:AIDACKCEVSQ6C2EXAMPLE:apps/810c7aab86d42fb2b56c8c966example",
                    "Id": "810c7aab86d42fb2b56c8c966example",
                    "Name": "ExampleCorp",
                    "tags": {
                        "Year": "2019",
                        "Stack": "Production"
                    }
                },
                {
                    "Arn": "arn:aws:mobiletargeting:us-west-2:AIDACKCEVSQ6C2EXAMPLE:apps/42d8c7eb0990a57ba1d5476a3example",
                    "Id": "42d8c7eb0990a57ba1d5476a3example",
                    "Name": "AnyCompany",
                    "tags": {}
                },
                {
                    "Arn": "arn:aws:mobiletargeting:us-west-2:AIDACKCEVSQ6C2EXAMPLE:apps/80f5c382b638ffe5ad12376bbexample",
                    "Id": "80f5c382b638ffe5ad12376bbexample",
                    "Name": "ExampleCorp_Test",
                    "tags": {
                        "Year": "2019",
                        "Stack": "Test"
                    }
                }
            ],
            "NextToken": "eyJDcmVhdGlvbkRhdGUiOiIyMDE5LTA3LTE2VDE0OjM4OjUzLjkwM1oiLCJBY2NvdW50SWQiOiI1MTIzOTcxODM4NzciLCJBcHBJZCI6Ijk1ZTM2MGRiMzBkMjQ1ZjRiYTYwYjhlMzllMzZlNjZhIn0"
        }
    }

The presence of the ``NextToken`` response value indicates that there is more output available. Call the command again and supply that value as the ``NextToken`` input parameter.
