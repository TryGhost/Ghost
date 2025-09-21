**To delete a service**

The following ``delete-service`` example deletes the specified service. ::

    aws vpc-lattice delete-service \
        --service-identifier svc-0285b53b2eEXAMPLE

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-west-2:123456789012:service/svc-0285b53b2eEXAMPLE",
        "id": "svc-0285b53b2eEXAMPLE",
        "name": "my-lattice-service",
        "status": "DELETE_IN_PROGRESS"
    }

For more information, see `Services in VPC Lattice <https://docs.aws.amazon.com/vpc-lattice/latest/ug/services.html>`__ in the *Amazon VPC Lattice User Guide*.