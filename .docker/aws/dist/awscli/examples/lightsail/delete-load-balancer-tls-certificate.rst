**To delete a TLS certificate for a load balancer**

The following ``delete-load-balancer-tls-certificate`` example deletes the specifie TLS certificate from the specified load balancer. ::

    aws lightsail delete-load-balancer-tls-certificate \
        --load-balancer-name MyFirstLoadBalancer \
        --certificate-name MyFirstCertificate

Output::

    {
        "operations": [
            {
                "id": "50bec274-e45e-4caa-8a69-b763ef636583",
                "resourceName": "MyFirstCertificate",
                "resourceType": "LoadBalancerTlsCertificate",
                "createdAt": 1569874989.48,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "DeleteLoadBalancerTlsCertificate",
                "status": "Started",
                "statusChangedAt": 1569874989.48
            },
            {
                "id": "78c58cdc-a59a-4b27-8213-500638634a8f",
                "resourceName": "MyFirstLoadBalancer",
                "resourceType": "LoadBalancer",
                "createdAt": 1569874989.48,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "DeleteLoadBalancerTlsCertificate",
                "status": "Started",
                "statusChangedAt": 1569874989.48
            }
        ]
    }
