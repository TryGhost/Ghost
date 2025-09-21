**To wait for cluster to be deleted**

The following ``wait cluster-deleted`` example pauses and continues only after it can confirm that the specified cluster is deleted. ::

    aws redshift wait cluster-deleted \
        --cluster-identifier mycluster

This command does not produce any output.
