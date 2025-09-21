**To discover registered instances**

The following ``discover-instances`` example discovers registered instances. ::

    aws servicediscovery discover-instances \
        --namespace-name example.com \
        --service-name myservice \
        --max-results 10 \
        --health-status ALL

Output::

    {
        "Instances": [
            {
                "InstanceId": "myservice-53",
                "NamespaceName": "example.com",
                "ServiceName": "myservice",
                "HealthStatus": "UNKNOWN",
                "Attributes": {
                    "AWS_INSTANCE_IPV4": "172.2.1.3",
                    "AWS_INSTANCE_PORT": "808"
                }
            }
        ]
    }

For more information, see `AWS Cloud Map service instances <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-instances.html>`__ in the *AWS Cloud Map Developer Guide*.
