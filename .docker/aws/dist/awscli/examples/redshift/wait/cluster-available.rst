**To wait for cluster to become available**

The following ``wait cluster-available`` example pauses and continues only after it can confirm that the specified cluster is available. ::

    aws redshift wait cluster-available \
        --cluster-identifier mycluster

This command does not produce any output.
