**To accept ownership of a private virtual interface**

The following ``confirm-private-virtual-interface`` command accepts ownership of a private virtual interface created by another customer::

  aws directconnect confirm-private-virtual-interface --virtual-interface-id dxvif-fgy8orxu --virtual-gateway-id vgw-e4a47df9

Output::

  {
      "virtualInterfaceState": "pending"
  }