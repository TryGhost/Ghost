**To describe the launch permissions for an AMI**

This example describes the launch permissions for the specified AMI. 

Command::

  aws ec2 describe-image-attribute --image-id ami-5731123e --attribute launchPermission

Output::

  {
      "LaunchPermissions": [
          {
              "UserId": "123456789012"
          }
      ],
      "ImageId": "ami-5731123e",
  }

**To describe the product codes for an AMI**

This example describes the product codes for the specified AMI. Note that this AMI has no product codes.

Command::

  aws ec2 describe-image-attribute --image-id ami-5731123e --attribute productCodes

Output::

  {
      "ProductCodes": [],
      "ImageId": "ami-5731123e",
  }