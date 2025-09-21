**To download a genome reference**

The following ``get-reference`` example downloads part 1 of a genome as ``hg38.1.fa``. ::

    aws omics get-reference \
        --reference-store-id 1234567890 \
        --id 1234567890 \
        --part-number 1 hg38.1.fa

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
