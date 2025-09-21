**To update an application**

The following ``update-application`` example updates a specific application in your AWS account to include a description. ::

    aws servicecatalog-appregistry update-application \
        --application "ExampleApplication" \
        --description "This is an example application"

Output::

    {
        "application": {
            "id": "0ars38r6btoohvpvd9gqrptt9l",
            "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/applications/0ars38r6btoohvpvd9gqrptt9l",
            "name": "ExampleApplication",
            "description": "This is an example application",
            "creationTime": "2023-02-28T21:10:10.820000+00:00",
            "lastUpdateTime": "2023-02-28T21:24:19.729000+00:00",
            "tags": {
                "aws:servicecatalog:applicationName": "ExampleApplication"
            }
        }
    }

For more information, see `Editing applications <https://docs.aws.amazon.com/servicecatalog/latest/arguide/edit-apps.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.