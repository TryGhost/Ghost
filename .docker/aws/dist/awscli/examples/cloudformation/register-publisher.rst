**To register a publisher**

The following ``register-publisher`` example registers a publisher and accepts the terms and condition parameter. ::

    aws cloudformation register-publisher \
      --region us-west-2 \
      --accept-terms-and-conditions

Output::

    {
        "PublisherId": "000q6TfUovXsEMmgKowxDZLlwqr2QUshd2e75c8c"
    }

For more information, see `Using the AWS CloudFormation registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation User Guide*.