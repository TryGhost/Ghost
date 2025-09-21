**To enable communication over a VPC peering connection from your local ClassicLink connection**

In this example, for peering connection ``pcx-aaaabbb``, the owner of the requester VPC modifies the VPC peering connection options to enable a local ClassicLink connection to communicate with the peer VPC.

Command::

  aws ec2 modify-vpc-peering-connection-options --vpc-peering-connection-id pcx-aaaabbbb --requester-peering-connection-options AllowEgressFromLocalClassicLinkToRemoteVpc=true
  
Output::

  {
    "RequesterPeeringConnectionOptions": {
        "AllowEgressFromLocalClassicLinkToRemoteVpc": true
    }
  }

**To enable communication over a VPC peering connection from your local VPC to a remote ClassicLink connection**

In this example, the owner of the accepter VPC modifies the VPC peering connection options to enable the local VPC to communicate with the ClassicLink connection in the peer VPC. 

Command::

  aws ec2 modify-vpc-peering-connection-options --vpc-peering-connection-id pcx-aaaabbbb --accepter-peering-connection-options AllowEgressFromLocalVpcToRemoteClassicLink=true

Output::

  {
    "AccepterPeeringConnectionOptions": {
      "AllowEgressFromLocalVpcToRemoteClassicLink": true
    }
  }

**To enable DNS resolution support for the VPC peering connection**

In this example, the owner of the requester VPC modifies the VPC peering connection options for ``pcx-aaaabbbb`` to enable the local VPC to resolve public DNS hostnames to private IP addresses when queried from instances in the peer VPC.

Command::

  aws ec2 modify-vpc-peering-connection-options --vpc-peering-connection-id pcx-aaaabbbb --requester-peering-connection-options AllowDnsResolutionFromRemoteVpc=true
  
Output::

  {
    "RequesterPeeringConnectionOptions": {
        "AllowDnsResolutionFromRemoteVpc": true
    }
  }