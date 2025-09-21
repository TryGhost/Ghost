**To copy an Amazon FPGA image**

This example copies the specified AFI from the ``us-east-1`` region to the current region (``eu-west-1``).

Command::

  aws ec2 copy-fpga-image --name copy-afi --source-fpga-image-id afi-0d123e123bfc85abc --source-region us-east-1 --region eu-west-1

Output::

  {
    "FpgaImageId": "afi-06b12350a123fbabc"
  }
