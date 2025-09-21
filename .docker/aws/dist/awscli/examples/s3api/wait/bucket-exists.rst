**To wait (pause running) until a bucket exists**

The following ``wait bucket-exists`` example pauses and continues only after it can confirm that the specified bucket exists. ::

    aws s3api wait bucket-exists \
        --bucket amzn-s3-demo-bucket

This command produces no output.
