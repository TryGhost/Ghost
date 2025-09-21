**To get the attributes of an service**

The following ``get-service-attributes`` example gets the attributes of a service. ::

    aws servicediscovery get-service-attributes \
        --service-id srv-e4anhexample0004

Output::

    {
        "ServiceAttributes": {
            "ServiceArn": "arn:aws:servicediscovery:us-west-2:111122223333;:service/srv-e4anhexample0004",
            "Attributes": {
                "Port": "80"
            }
        }
    }

For more information, see `AWS Cloud Map services <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-services.html>`__ in the *AWS Cloud Map Developer Guide*.
