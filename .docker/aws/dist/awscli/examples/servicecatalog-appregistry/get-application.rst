**To get an application**

The following ``get-application`` example retrieves metadata information about a specific application in your AWS account. ::

    aws servicecatalog-appregistry get-application \
        --application "ExampleApplication" 

Output::

    {
        "id": "0ars38r6btoohvpvd9gqrptt9l",
        "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/applications/0ars38r6btoohvpvd9gqrptt9l",
        "name": "ExampleApplication",
        "creationTime": "2023-02-28T21:10:10.820000+00:00",
        "lastUpdateTime": "2023-02-28T21:10:10.820000+00:00",
        "associatedResourceCount": 0,
        "tags": {
            "aws:servicecatalog:applicationName": "ExampleApplication"
        },
        "integrations": {
            "resourceGroup": {
                "state": "CREATE_COMPLETE",
                "arn": "arn:aws:resource-groups:us-west-2:813737243517:group/AWS_AppRegistry_Application-ExampleApplication"
            }
        }
    }

For more information, see `Using Application details <https://docs.aws.amazon.com/servicecatalog/latest/arguide/access-app-details.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.