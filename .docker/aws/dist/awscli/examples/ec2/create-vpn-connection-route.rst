**To create a static route for a VPN connection**

This example creates a static route for the specified VPN connection. If the command succeeds, no output is returned.

Command::

  aws ec2 create-vpn-connection-route --vpn-connection-id vpn-40f41529 --destination-cidr-block 11.12.0.0/16
