**To create an application**

The following ``create-application`` example creates a new application in your AWS account. ::

    aws servicecatalog-appregistry create-application \
        --name "ExampleApplication"

Output::

    {
        "application": {
            "id": "0ars38r6btoohvpvd9gqrptt9l",
            "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/applications/0ars38r6btoohvpvd9gqrptt9l",
            "name": "ExampleApplication",
            "creationTime": "2023-02-28T21:10:10.820000+00:00",
            "lastUpdateTime": "2023-02-28T21:10:10.820000+00:00",
            "tags": {}
        }
    }

For more information, see `Creating applications <https://docs.aws.amazon.com/servicecatalog/latest/arguide/create-apps.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.