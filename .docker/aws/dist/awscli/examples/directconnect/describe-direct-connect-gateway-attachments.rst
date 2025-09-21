**To describe Direct Connect gateway attachments**

The following example describes the virtual interfaces that are attached to Direct Connect gateway ``5f294f92-bafb-4011-916d-9b0bexample``.

Command::

  aws directconnect describe-direct-connect-gateway-attachments --direct-connect-gateway-id 5f294f92-bafb-4011-916d-9b0bexample

Output::

  {
    "directConnectGatewayAttachments": [
        {
            "virtualInterfaceOwnerAccount": "123456789012", 
            "directConnectGatewayId": "5f294f92-bafb-4011-916d-9b0bexample", 
            "virtualInterfaceRegion": "us-east-2", 
            "attachmentState": "attaching", 
            "virtualInterfaceId": "dxvif-fg9zyabc"
        }
    ], 
    "nextToken": "eyJ2IjoxLCJzIjoxLCJpIjoibEhXdlNpUXF5RzhoL1JyUW52SlV2QT09IiwiYyI6Im5wQjFHQ0RyQUdRS3puNnNXcUlINCtkTTA4dTk3KzBiU0xtb05JQmlaczZ6NXRIYmk3c3VESUxFTTd6a2FzVHM0VTFwaGJkZGNxTytqWmQ3QzMzOGRQaTVrTThrOG1zelRsV3gyMWV3VTNFPSJ9"
  }