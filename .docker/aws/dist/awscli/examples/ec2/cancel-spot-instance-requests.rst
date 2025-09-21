**To cancel Spot Instance requests**

This example command cancels a Spot Instance request.

Command::

  aws ec2 cancel-spot-instance-requests --spot-instance-request-ids sir-08b93456

Output::

  {
      "CancelledSpotInstanceRequests": [
          {
              "State": "cancelled",
              "SpotInstanceRequestId": "sir-08b93456"
          }
      ]
  }

