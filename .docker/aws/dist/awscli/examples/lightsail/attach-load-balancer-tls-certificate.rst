**To attach a TLS certificate to a load balancer**

The following ``attach-load-balancer-tls-certificate`` example attaches the load balancer TLS certificate ``Certificate2`` to the load balancer ``LoadBalancer-1``. ::

    aws lightsail attach-load-balancer-tls-certificate \
        --certificate-name Certificate2 \
        --load-balancer-name LoadBalancer-1

Output::

    {
        "operations": [
            {
                "id": "cf1ad6e3-3cbb-4b8a-a7f2-3EXAMPLEa118",
                "resourceName": "LoadBalancer-1",
                "resourceType": "LoadBalancer",
                "createdAt": 1571072255.416,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "Certificate2",
                "operationType": "AttachLoadBalancerTlsCertificate",
                "status": "Succeeded",
                "statusChangedAt": 1571072255.416
            },
            {
                "id": "dae1bcfb-d531-4c06-b4ea-bEXAMPLEc04e",
                "resourceName": "Certificate2",
                "resourceType": "LoadBalancerTlsCertificate",
                "createdAt": 1571072255.416,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "LoadBalancer-1",
                "operationType": "AttachLoadBalancerTlsCertificate",
                "status": "Succeeded",
                "statusChangedAt": 1571072255.416
            }
        ]
    }
