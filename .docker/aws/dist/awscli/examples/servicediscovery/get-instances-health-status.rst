**To get the health status of instances associated with a service**

The following ``get-instances-health-status`` example gets the health status of instances associated with the specified service. ::

    aws servicediscovery get-instances-health-status \
        --service-id srv-e4anhexample0004

Output::

    {
        "Status": {
            "i-abcd1234": "HEALTHY",
            "i-abcd1235": "UNHEALTHY"
        }
    }

For more information, see `AWS Cloud Map service instances <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-instances.html>`__ in the *AWS Cloud Map Developer Guide*.
