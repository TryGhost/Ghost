**To unassign an IPv6 address from a network interface**

This example unassigns the specified IPv6 address from the specified network interface.

Command::

  aws ec2 unassign-ipv6-addresses --ipv6-addresses 2001:db8:1234:1a00:3304:8879:34cf:4071 --network-interface-id eni-23c49b68

Output::

  {
    "NetworkInterfaceId": "eni-23c49b68", 
    "UnassignedIpv6Addresses": [
        "2001:db8:1234:1a00:3304:8879:34cf:4071"
    ]
  }
