**To get the details of an instance**

The following ``get-instance`` example gets the attributes of a service. ::

    aws servicediscovery get-instance \
        --service-id srv-e4anhexample0004
        --instance-id i-abcd1234

Output::

    {
        "Instances": {
            "Id": "arn:aws:servicediscovery:us-west-2:111122223333;:service/srv-e4anhexample0004",
            "Attributes": {
                "AWS_INSTANCE_IPV4": "192.0.2.44",
                "AWS_INSTANCE_PORT": "80",
                "color": "green",
                "region": "us-west-2",
                "stage": "beta"
            }
        }
    }

For more information, see `AWS Cloud Map service instances <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-instances.html>`__ in the *AWS Cloud Map Developer Guide*.
