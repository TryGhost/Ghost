**To modify the attributes of an Amazon FPGA image**

This example adds load permissions for account ID ``123456789012`` for the specified AFI.

Command::

  aws ec2 modify-fpga-image-attribute --attribute loadPermission --fpga-image-id afi-0d123e123bfc85abc --load-permission Add=[{UserId=123456789012}]

Output::

  {
    "FpgaImageAttribute": {
        "FpgaImageId": "afi-0d123e123bfc85abc", 
        "LoadPermissions": [
            {
                "UserId": "123456789012"
            }
        ]
    }
  }
