**To modify a Spot fleet request**

This example command updates the target capacity of the specified Spot fleet request.

Command::

  aws ec2 modify-spot-fleet-request --target-capacity 20 --spot-fleet-request-id sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE 

Output::

  {
      "Return": true
  }

This example command decreases the target capacity of the specified Spot fleet request without terminating any Spot Instances as a result.

Command::

  aws ec2 modify-spot-fleet-request --target-capacity 10 --excess-capacity-termination-policy NoTermination --spot-fleet-request-ids sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE

Output::

  {
      "Return": true
  }
