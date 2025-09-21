**To list AWS CloudFormation stacks**

The following ``list-stacks`` command shows a summary of all stacks that have a status of ``CREATE_COMPLETE``::

  aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE

Output::

  [
      {
          "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/myteststack/466df9e0-0dff-08e3-8e2f-5088487c4896",
          "TemplateDescription": "AWS CloudFormation Sample Template S3_Bucket: Sample template showing how to create a publicly accessible S3 bucket. **WARNING** This template creates an S3 bucket. You will be billed for the AWS resources used if you create a stack from this template.",
          "StackStatusReason": null,
          "CreationTime": "2013-08-26T03:27:10.190Z",
          "StackName": "myteststack",
          "StackStatus": "CREATE_COMPLETE"
      }
  ]