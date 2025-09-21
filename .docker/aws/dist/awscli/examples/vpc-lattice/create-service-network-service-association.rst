**To create a service association**

The following ``create-service-network-service-association`` example associates the specified service with the specified service network. ::

    aws vpc-lattice create-service-network-service-association \
        --service-identifier svc-0285b53b2eEXAMPLE \
        --service-network-identifier sn-080ec7dc93EXAMPLE

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetworkserviceassociation/snsa-0e16955a8cEXAMPLE",
        "createdBy": "123456789012",
        "dnsEntry": {
            "domainName": "my-lattice-service-0285b53b2eEXAMPLE.7d67968.vpc-lattice-svcs.us-east-2.on.aws",
            "hostedZoneId": "Z09127221KTH2CEXAMPLE"
        },
        "id": "snsa-0e16955a8cEXAMPLE",
        "status": "CREATE_IN_PROGRESS"
    }

For more information, see `Manage service associations <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-network-associations.html#service-network-service-associations>`__ in the *Amazon VPC Lattice User Guide*.