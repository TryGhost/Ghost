**To get information about a service**

The following ``get-service`` example gets information about the specified service. ::

    aws vpc-lattice get-service \
        --service-identifier svc-0285b53b2eEXAMPLE

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE",
        "authType": "AWS_IAM",
        "createdAt": "2023-05-05T21:35:29.339Z",
        "dnsEntry": {
            "domainName": "my-lattice-service-0285b53b2eEXAMPLE.7d67968.vpc-lattice-svcs.us-east-2.on.aws",
            "hostedZoneId": "Z09127221KTH2CFUOHIZH"
        },
        "id": "svc-0285b53b2eEXAMPLE",
        "lastUpdatedAt": "2023-05-05T21:35:29.339Z",
        "name": "my-lattice-service",
        "status": "ACTIVE"
    }

For more information, see `Services <https://docs.aws.amazon.com/vpc-lattice/latest/ug/services.html>`__ in the *Amazon VPC Lattice User Guide*.