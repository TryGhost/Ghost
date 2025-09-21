**To wait for CloudFormation to finish creating a stack**

The following ``wait stack-create-complete`` example pauses and resumes only after it can confirm that CloudFormation has successfully created the specified stack. ::

    aws cloudformation wait stack-create-complete \
        --stack-name "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack-1234/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"

This command produces no output.