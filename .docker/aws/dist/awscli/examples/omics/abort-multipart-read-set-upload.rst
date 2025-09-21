**To stop a multipart read set upload**

The following ``abort-multipart-read-set-upload`` example stops a multipart read set upload into your HealthOmics sequence store. ::

    aws omics abort-multipart-read-set-upload \
        --sequence-store-id 0123456789 \
        --upload-id 1122334455 

This command produces no output.

For more information, see `Direct upload to a sequence store <https://docs.aws.amazon.com/omics/latest/dev/synchronous-uploads.html>`__ in the *AWS HealthOmics User Guide*.