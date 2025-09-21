**To conclude a multipart upload once you have uploaded all of the components.**

The following ``complete-multipart-read-set-upload`` example concludes a multipart upload into a sequence store once all of the components have been uploaded. ::

    aws omics complete-multipart-read-set-upload \
        --sequence-store-id 0123456789 \
        --upload-id 1122334455 \
        --parts '[{"checksum":"gaCBQMe+rpCFZxLpoP6gydBoXaKKDA/Vobh5zBDb4W4=","partNumber":1,"partSource":"SOURCE1"}]'


Output::

    {
        "readSetId": "0000000001"
        "readSetId": "0000000002"
        "readSetId": "0000000003"
    }

For more information, see `Direct upload to a sequence store <https://docs.aws.amazon.com/omics/latest/dev/synchronous-uploads.html>`__ in the *AWS HealthOmics User Guide*.