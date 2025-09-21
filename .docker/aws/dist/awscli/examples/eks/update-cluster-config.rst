**To update cluster endpoint access**

This example command updates a cluster to disable endpoint public access and enable private endpoint access.

Command::

  aws eks update-cluster-config --name example \
  --resources-vpc-config endpointPublicAccess=false,endpointPrivateAccess=true

Output::

  {
      "update": {
          "id": "ec883c93-2e9e-407c-a22f-8f6fa6e67d4f",
          "status": "InProgress",
          "type": "EndpointAccessUpdate",
          "params": [
              {
                  "type": "EndpointPublicAccess",
                  "value": "false"
              },
              {
                  "type": "EndpointPrivateAccess",
                  "value": "true"
              }
          ],
          "createdAt": 1565806986.506,
          "errors": []
      }
  }

**To enable logging for a cluster**

This example command enables all cluster control plane logging types for a cluster named ``example``.

Command::

  aws eks update-cluster-config --name example \
  --logging '{"clusterLogging":[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]}'

Output::

  {
      "update": {
          "id": "7551c64b-1d27-4b1e-9f8e-c45f056eb6fd",
          "status": "InProgress",
          "type": "LoggingUpdate",
          "params": [
              {
                  "type": "ClusterLogging",
                  "value": "{\"clusterLogging\":[{\"types\":[\"api\",\"audit\",\"authenticator\",\"controllerManager\",\"scheduler\"],\"enabled\":true}]}"
              }
          ],
          "createdAt": 1565807210.37,
          "errors": []
      }
  }
