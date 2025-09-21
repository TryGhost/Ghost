**To wait for snapshot to become available**

The following ``wait snapshot-available`` example pauses and continues only after it can confirm that the specified snapshot is available. ::

    aws redshift wait snapshot-available \
        --snapshot-identifier mycluster-2019-11-06-16-31

This command does not produce any output.
