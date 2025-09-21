**To release a Dedicated host from your account**

To release a Dedicated host from your account. Instances that are on the host must be stopped or terminated before the host can be released.

Command::

  aws ec2 release-hosts --host-id=h-0029d6e3cacf1b3da

Output::

  { 
      "Successful":  [
          "h-0029d6e3cacf1b3da"
           ],
    "Unsuccessful": []
    
   }
