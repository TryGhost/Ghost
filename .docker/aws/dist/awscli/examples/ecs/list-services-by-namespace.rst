**To list the services in a namespace**

The following ``list-services-by-namespace`` example lists all of the services configured for the specified namespace in your default Region. ::

    aws ecs list-services-by-namespace \
        --namespace service-connect

Output::

    {
        "serviceArns": [
            "arn:aws:ecs:us-west-2:123456789012:service/MyCluster/MyService",
            "arn:aws:ecs:us-west-2:123456789012:service/tutorial/service-connect-nginx-service"
        ]
    }

For more information, see `Service Connect <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html>`__ in the *Amazon ECS Developer Guide*.
