**To release an IPAM pool allocation**

In this example, you're an IPAM delegated admin who tried to delete an IPAM pool but received an error that you cannot delete the pool while the pool has allocations. You are using this command to release a pool allocation. 

Note the following:

* You can only use this command for custom allocations. To remove an allocation for a resource without deleting the resource, set its monitored state to false using `modify-ipam-resource-cidr <https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-ipam-resource-cidr.html>`__.
* To complete this request, you'll need the IPAM pool ID, which you can get with `describe-ipam-pools <https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-ipam-pools.html>`__. You'll also need the allocation ID, which you can get with `get-ipam-pool-allocations <https://docs.aws.amazon.com/cli/latest/reference/ec2/get-ipam-pool-allocations.html>`__.
* If you do not want to remove allocations one by one, you can use the ``--cascade option`` when you delete an IPAM pool to automatically release any allocations in the pool before deleting it.
* There are a number of prerequisites before running this command. For more information, see `Release an allocation <https://docs.aws.amazon.com/vpc/latest/ipam/release-alloc-ipam.html>`__ in the *Amazon VPC IPAM User Guide*.
* The ``--region`` in which you run this command must be the locale of the IPAM pool where the allocation is.

The following ``release-ipam-pool-allocation`` example releases an IPAM pool allocation. ::

    aws ec2 release-ipam-pool-allocation \
        --ipam-pool-id ipam-pool-07bdd12d7c94e4693 \
        --cidr 10.0.0.0/23 \
        --ipam-pool-allocation-id ipam-pool-alloc-0e66a1f730da54791b99465b79e7d1e89 \
        --region us-west-1

Output::

    {
        "Success": true
    }

Once you release an allocation, you may want to run `delete-ipam-pool <https://docs.aws.amazon.com/cli/latest/reference/ec2/delete-ipam-pool.html>`__.