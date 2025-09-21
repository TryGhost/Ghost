**To create an Amazon FPGA image**

This example creates an AFI from the specified tarball in the specified bucket.

Command::

  aws ec2 create-fpga-image --name my-afi --description test-afi --input-storage-location Bucket=my-fpga-bucket,Key=dcp/17_12_22-103226.Developer_CL.tar --logs-storage-location Bucket=my-fpga-bucket,Key=logs 

Output::

  {
    "FpgaImageId": "afi-0d123e123bfc85abc", 
    "FpgaImageGlobalId": "agfi-123cb27b5e84a0abc"
  }
