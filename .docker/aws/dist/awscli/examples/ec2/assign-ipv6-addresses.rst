**To assign specific IPv6 addresses to a network interface**

This example assigns the specified IPv6 addresses to the specified network interface.

Command::

  aws ec2 assign-ipv6-addresses --network-interface-id eni-38664473 --ipv6-addresses 2001:db8:1234:1a00:3304:8879:34cf:4071 2001:db8:1234:1a00:9691:9503:25ad:1761

Output::

  {
    "AssignedIpv6Addresses": [
        "2001:db8:1234:1a00:3304:8879:34cf:4071", 
        "2001:db8:1234:1a00:9691:9503:25ad:1761"
    ], 
    "NetworkInterfaceId": "eni-38664473"
  }

**To assign IPv6 addresses that Amazon selects to a network interface**

This example assigns two IPv6 addresses to the specified network interface. Amazon automatically assigns these IPv6 addresses from the available IPv6 addresses in the IPv6 CIDR block range of the subnet.

Command::

  aws ec2 assign-ipv6-addresses --network-interface-id eni-38664473 --ipv6-address-count 2

Output::

  {
    "AssignedIpv6Addresses": [
        "2001:db8:1234:1a00:3304:8879:34cf:4071", 
        "2001:db8:1234:1a00:9691:9503:25ad:1761"
    ], 
    "NetworkInterfaceId": "eni-38664473"
  }
