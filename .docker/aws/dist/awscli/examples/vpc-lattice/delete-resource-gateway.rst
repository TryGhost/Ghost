**To delete a resource gateway**

The following ``delete-resource-gateway`` example deletes the specified resource gateway. ::

    aws vpc-lattice delete-resource-gateway \
        --resource-gateway-identifier rgw-0bba03f3d56060135

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-1:123456789012:resourcegateway/rgw-0bba03f3d56060135",
        "id": "rgw-0bba03f3d56060135",
        "name": "my-resource-gateway",
        "status": "DELETE_IN_PROGRESS"
    }

For more information, see `Resource gateways in VPC Lattice <https://docs.aws.amazon.com/vpc-lattice/latest/ug/resource-gateway.html>`__ in the *Amazon VPC Lattice User Guide*.
