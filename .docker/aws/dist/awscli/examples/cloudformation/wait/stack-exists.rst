**To wait for confirmation that a stack exists**

The following ``wait stack-exists`` example pauses and resumes only after it can confirm that the specified stack actually exists. ::

    aws cloudformation wait stack-exists \
        --stack-name "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack-1234/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"

This command produces no output.