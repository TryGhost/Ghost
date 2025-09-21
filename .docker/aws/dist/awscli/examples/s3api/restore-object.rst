**To create a restore request for an object**

The following ``restore-object`` example restores the specified Amazon S3 Glacier object for the bucket ``my-glacier-bucket`` for 10 days. ::

    aws s3api restore-object \
        --bucket my-glacier-bucket \
        --key doc1.rtf \
        --restore-request Days=10

This command produces no output.
