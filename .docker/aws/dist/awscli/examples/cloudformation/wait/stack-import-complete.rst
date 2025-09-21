**To wait for confirmation that resources have been imported into a stack**

The following ``wait stack-import-complete`` example pauses and resumes only after it can confirm that the import operation successfully completed for all resources in the stack that support resource import. ::

    aws cloudformation wait stack-import-complete \
        --stack-name "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack-1234/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"

This command produces no output.