**To test an extension**

The following ``test-type`` example tests a registered extension to make sure it meets all necessary requirements for being published in the CloudFormation registry. ::

    aws cloudformation test-type \
        --arn arn:aws:cloudformation:us-west-2:123456789012:type/resource/Sample-Test-Resource123/00000001

Output::

    {
        "TypeVersionArn": "arn:aws:cloudformation:us-west-2:123456789012:type/resource/Sample-Test-Resource123/00000001"
    }

For more information, see `Using the AWS CloudFormation registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation User Guide*.