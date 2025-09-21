**To delete an application**

The following ``delete-application`` example deletes a specific application in your AWS account. ::

    aws servicecatalog-appregistry delete-application \
        --application "ExampleApplication3"

Output::

    {
        "application": {
            "id": "055gw7aynr1i5mbv7kjwzx5945",
            "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/applications/055gw7aynr1i5mbv7kjwzx5945",
            "name": "ExampleApplication3",
            "creationTime": "2023-02-28T22:06:28.228000+00:00",
            "lastUpdateTime": "2023-02-28T22:06:28.228000+00:00"
        }
    }

For more information, see `Deleting applications <https://docs.aws.amazon.com/servicecatalog/latest/arguide/delete-app-details.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.