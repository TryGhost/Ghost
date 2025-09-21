**To get information about TLS certificates for a load balancer**

The following ``get-load-balancer-tls-certificates`` example displays details about the TLS certificates for the specified load balancer. ::

    aws lightsail get-load-balancer-tls-certificates \
        --load-balancer-name LoadBalancer-1

Output::

    {
        "tlsCertificates": [
            {
                "name": "example-com",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:LoadBalancerTlsCertificate/d7bf4643-6a02-4cd4-b3c4-fEXAMPLE9b4d",
                "supportCode": "6EXAMPLE3362/arn:aws:acm:us-west-2:333322221111:certificate/9af8e32c-a54e-4a67-8c63-cEXAMPLEb314",
                "createdAt": 1571678025.3,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "LoadBalancerTlsCertificate",
                "loadBalancerName": "LoadBalancer-1",
                "isAttached": false,
                "status": "ISSUED",
                "domainName": "example.com",
                "domainValidationRecords": [
                    {
                        "name": "_dEXAMPLE4ede046a0319eb44a4eb3cbc.example.com.",
                        "type": "CNAME",
                        "value": "_bEXAMPLE0899fb7b6bf79d9741d1a383.hkvuiqjoua.acm-validations.aws.",
                        "validationStatus": "SUCCESS",
                        "domainName": "example.com"
                    }
                ],
                "issuedAt": 1571678070.0,
                "issuer": "Amazon",
                "keyAlgorithm": "RSA-2048",
                "notAfter": 1605960000.0,
                "notBefore": 1571616000.0,
                "serial": "00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff",
                "signatureAlgorithm": "SHA256WITHRSA",
                "subject": "CN=example.com",
                "subjectAlternativeNames": [
                    "example.com"
                ]
            }
        ]
    }
