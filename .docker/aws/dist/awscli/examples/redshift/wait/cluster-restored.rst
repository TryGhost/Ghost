**To wait for cluster to be restored**

The following ``wait cluster-restored`` example pauses and resumes only after the CLI can confirm that the specified cluster is restored. ::

    aws redshift wait cluster-restored \
        --cluster-identifier mycluster

This command does not produce any output.
