**To apply a Legal Hold to an object**

The following ``put-object-legal-hold`` example sets a Legal Hold on the object ``doc1.rtf``. ::

    aws s3api put-object-legal-hold \
        --bucket amzn-s3-demo-bucket-with-object-lock \
        --key doc1.rtf \
        --legal-hold Status=ON

This command produces no output.
