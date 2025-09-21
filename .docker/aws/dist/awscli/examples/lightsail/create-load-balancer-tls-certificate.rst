**To create a TLS certificate for a load balancer**

The following ``create-load-balancer-tls-certificate`` example creates a TLS certificate that is attached to the specified load balancer. The certificate created applies to the specified domains.
**Note:** Only two certificates can be created for a load balancer. ::

    aws lightsail create-load-balancer-tls-certificate \
        --certificate-alternative-names abc.example.com \
        --certificate-domain-name example.com \
        --certificate-name MySecondCertificate \
        --load-balancer-name MyFirstLoadBalancer

Output::

    {
        "operations": [
            {
                "id": "be663aed-cb46-41e2-9b23-e2f747245bd4",
                "resourceName": "MySecondCertificate",
                "resourceType": "LoadBalancerTlsCertificate",
                "createdAt": 1569867364.971,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "MyFirstLoadBalancer",
                "operationType": "CreateLoadBalancerTlsCertificate",
                "status": "Succeeded",
                "statusChangedAt": 1569867365.219
            },
            {
                "id": "f3dfa930-969e-41cc-ac7d-337178716f6d",
                "resourceName": "MyFirstLoadBalancer",
                "resourceType": "LoadBalancer",
                "createdAt": 1569867364.971,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "MySecondCertificate",
                "operationType": "CreateLoadBalancerTlsCertificate",
                "status": "Succeeded",
                "statusChangedAt": 1569867365.219
            }
        ]
    }
