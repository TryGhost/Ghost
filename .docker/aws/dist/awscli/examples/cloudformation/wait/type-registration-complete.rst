**To wait for CloudFormation to register a resource type**

The following ``wait type-registration-complete`` example pauses and resumes only after it can confirm that CloudFormation has registered the specified resource type. ::

    aws cloudformation wait type-registration-complete \
        --registration-token "f5525280-104e-4d35-bef5-8f1f1example"

This command produces no output.