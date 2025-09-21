**To list applications**

The following ``list-applications`` example retrieves a list of all the applications in your AWS account. ::

    aws servicecatalog-appregistry list-applications

Output::

    {
        "applications": [
            {
                "id": "03axw94pjfj3uan00tcgbrxnkw",
                "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/applications/03axw94pjfj3uan00tcgbrxnkw",
                "name": "ExampleApplication2",
                "creationTime": "2023-02-28T21:59:34.094000+00:00",
                "lastUpdateTime": "2023-02-28T21:59:34.094000+00:00"
            },
            {
                "id": "055gw7aynr1i5mbv7kjwzx5945",
                "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/applications/055gw7aynr1i5mbv7kjwzx5945",
                "name": "ExampleApplication3",
                "creationTime": "2023-02-28T22:06:28.228000+00:00",
                "lastUpdateTime": "2023-02-28T22:06:28.228000+00:00"
            },
            {
                "id": "0ars38r6btoohvpvd9gqrptt9l",
                "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/applications/0ars38r6btoohvpvd9gqrptt9l",
                "name": "ExampleApplication",
                "description": "This is an example application",
                "creationTime": "2023-02-28T21:10:10.820000+00:00",
                "lastUpdateTime": "2023-02-28T21:24:19.729000+00:00"
            }
        ]
    }

For more information, see `Viewing application details <https://docs.aws.amazon.com/servicecatalog/latest/arguide/view-app-details.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.