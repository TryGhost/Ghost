**To wait for CloudFormation to finish rolling back a stack**

The following ``wait stack-rollback-complete`` example pauses and resumes only after it can confirm that CloudFormation has completed a rollback operation on the specified stack. ::

    aws cloudformation wait stack-rollback-complete \
        --stack-name "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack-1234/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"

This command produces no output.