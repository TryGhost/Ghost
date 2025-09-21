**To wait (pause running) until an object no longer exists**

The following ``wait object-not-exists`` example pauses and continues only after it can confirm that the specified object (``--key``) in the specified bucket doesn't exist. ::

    aws s3api wait object-not-exists \
        --bucket amzn-s3-demo-bucket \
        --key doc1.rtf

This command produces no output.