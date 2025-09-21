**To delete a load balancer**

The following ``delete-load-balancer`` example deletes the specified load balancer and any associated TLS certificates. ::

    aws lightsail delete-load-balancer \
        --load-balancer-name MyFirstLoadBalancer

Output::

    {
        "operations": [
            {
                "id": "a8c968c7-72a3-4680-a714-af8f03eea535",
                "resourceName": "MyFirstLoadBalancer",
                "resourceType": "LoadBalancer",
                "createdAt": 1569875092.125,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationType": "DeleteLoadBalancer",
                "status": "Succeeded",
                "statusChangedAt": 1569875092.125
            },
            {
                "id": "f91a29fc-8ce3-4e69-a227-ea70ca890bf5",
                "resourceName": "MySecondCertificate",
                "resourceType": "LoadBalancerTlsCertificate",
                "createdAt": 1569875091.938,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "DeleteLoadBalancerTlsCertificate",
                "status": "Started",
                "statusChangedAt": 1569875091.938
            },
            {
                "id": "cf64c060-154b-4eb4-ba57-84e2e41563d6",
                "resourceName": "MyFirstLoadBalancer",
                "resourceType": "LoadBalancer",
                "createdAt": 1569875091.94,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "DeleteLoadBalancerTlsCertificate",
                "status": "Started",
                "statusChangedAt": 1569875091.94
            }
        ]
    }

For more information, see `title <link>`__ in the *guide*.
