**To create a service**

The following ``create-service`` example creates a service with the specified name. ::

    aws vpc-lattice create-service \
        --name my-lattice-service

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE",
        "authType": "NONE",
        "dnsEntry": {
            "domainName": "my-lattice-service-0285b53b2eEXAMPLE.1a2b3c4.vpc-lattice-svcs.us-east-2.on.aws",
            "hostedZoneId": "Z09127221KTH2CEXAMPLE"
        },
        "id": "svc-0285b53b2eEXAMPLE",
        "name": "my-lattice-service",
        "status": "CREATE_IN_PROGRESS"
    }

For more information, see `Services in VPC Lattice <https://docs.aws.amazon.com/vpc-lattice/latest/ug/services.html>`__ in the *Amazon VPC Lattice User Guide*.