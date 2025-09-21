**To get information about a service association**

The following ``get-service-network-service-association`` example gets information about the specified service association. ::

    aws vpc-lattice get-service-network-service-association \
        --service-network-service-association-identifier snsa-031fabb4d8EXAMPLE

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetworkserviceassociation/snsa-031fabb4d8EXAMPLE",
        "createdAt": "2023-05-05T21:48:16.076Z",
        "createdBy": "123456789012",
        "dnsEntry": {
            "domainName": "my-lattice-service-0285b53b2eEXAMPLE.7d67968.vpc-lattice-svcs.us-east-2.on.aws",
            "hostedZoneId": "Z09127221KTH2CEXAMPLE"
        },
        "id": "snsa-031fabb4d8EXAMPLE",
        "serviceArn": "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE",
        "serviceId": "svc-0285b53b2eEXAMPLE",
        "serviceName": "my-lattice-service",
        "serviceNetworkArn": "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetwork/sn-080ec7dc93EXAMPLE",
        "serviceNetworkId": "sn-080ec7dc93EXAMPLE",
        "serviceNetworkName": "my-service-network",
        "status": "ACTIVE"
    }

For more information, see `Manage service associations <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-network-associations.html#service-network-service-associations>`__ in the *Amazon VPC Lattice User Guide*.