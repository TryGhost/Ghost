**To reset the attributes of an Amazon FPGA image**

This example resets the load permissions for the specified AFI.

Command::

  aws ec2 reset-fpga-image-attribute --fpga-image-id afi-0d123e123bfc85abc --attribute loadPermission

Output::

  {
    "Return": true
  }
