**To download a read set**

The following ``get-read-set`` example downloads part 3 of a read set as ``1234567890.3.bam``. ::

    aws omics get-read-set \
        --sequence-store-id 1234567890 \
        --id 1234567890 \
        --part-number 3  1234567890.3.bam

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
