**To view the template body for an AWS CloudFormation stack**

The following ``get-template`` command shows the template for the ``myteststack`` stack::

  aws cloudformation get-template --stack-name myteststack

Output::

  {
      "TemplateBody": {
          "AWSTemplateFormatVersion": "2010-09-09",
          "Outputs": {
              "BucketName": {
                  "Description": "Name of S3 bucket to hold website content",
                  "Value": {
                      "Ref": "S3Bucket"
                  }
              }
          },
          "Description": "AWS CloudFormation Sample Template S3_Bucket: Sample template showing how to create a publicly accessible S3 bucket. **WARNING** This template creates an S3 bucket. You will be billed for the AWS resources used if you create a stack from this template.",
          "Resources": {
              "S3Bucket": {
                  "Type": "AWS::S3::Bucket",
                  "Properties": {
                      "AccessControl": "PublicRead"
                  }
              }
          }
      }
  }