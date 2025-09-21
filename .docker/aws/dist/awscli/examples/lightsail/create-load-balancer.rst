**To create a load balancer**

The following ``create-load-balancer`` example creates a load balancer with a TLS certificate. The TLS certificate applies to the specified domains, and routes traffic to instances on port 80. ::

    aws lightsail create-load-balancer \
        --certificate-alternative-names www.example.com test.example.com \
        --certificate-domain-name example.com \
        --certificate-name Certificate-1 \
        --instance-port 80 \
        --load-balancer-name LoadBalancer-1

Output::

    {
        "operations": [
            {
                "id": "cc7b920a-83d8-4762-a74e-9174fe1540be",
                "resourceName": "LoadBalancer-1",
                "resourceType": "LoadBalancer",
                "createdAt": 1569867169.406,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "CreateLoadBalancer",
                "status": "Started",
                "statusChangedAt": 1569867169.406
            },
            {
                "id": "658ed43b-f729-42f3-a8e4-3f8024d3c98d",
                "resourceName": "LoadBalancer-1",
                "resourceType": "LoadBalancerTlsCertificate",
                "createdAt": 1569867170.193,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "LoadBalancer-1",
                "operationType": "CreateLoadBalancerTlsCertificate",
                "status": "Succeeded",
                "statusChangedAt": 1569867170.54
            },
            {
                "id": "4757a342-5181-4870-b1e0-227eebc35ab5",
                "resourceName": "LoadBalancer-1",
                "resourceType": "LoadBalancer",
                "createdAt": 1569867170.193,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "Certificate-1",
                "operationType": "CreateLoadBalancerTlsCertificate",
                "status": "Succeeded",
                "statusChangedAt": 1569867170.54
            }
        ]
    }

For more information, see `Lightsail load balancers <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/understanding-lightsail-load-balancers>`__ in the *Lightsail Developer Guide*.
