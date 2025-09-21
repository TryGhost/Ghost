**To describe AWS CloudFormation stacks**

The following ``describe-stacks`` command shows summary information for the ``myteststack`` stack::

  aws cloudformation describe-stacks --stack-name myteststack

Output::

  {
      "Stacks":  [
          {
              "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/myteststack/466df9e0-0dff-08e3-8e2f-5088487c4896",
              "Description": "AWS CloudFormation Sample Template S3_Bucket: Sample template showing how to create a publicly accessible S3 bucket. **WARNING** This template creates an S3 bucket. You will be billed for the AWS resources used if you create a stack from this template.",
              "Tags": [],
              "Outputs": [
                  {
                      "Description": "Name of S3 bucket to hold website content",
                      "OutputKey": "BucketName",
                      "OutputValue": "myteststack-s3bucket-jssofi1zie2w"
                  }
              ],
              "StackStatusReason": null,
              "CreationTime": "2013-08-23T01:02:15.422Z",
              "Capabilities": [],
              "StackName": "myteststack",
              "StackStatus": "CREATE_COMPLETE",
              "DisableRollback": false
          }
      ]
  }

For more information, see `Stacks`_ in the *AWS CloudFormation User Guide*.

.. _`Stacks`: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/concept-stack.html
