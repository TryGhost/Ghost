**Example 1: To cancel a Spot fleet request and terminate the associated instances**

The following ``cancel-spot-fleet-requests`` example cancels a Spot Fleet request and terminates the associated On-Demand Instances and Spot Instances. ::

    aws ec2 cancel-spot-fleet-requests \
        --spot-fleet-request-ids sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE \
        --terminate-instances

Output::

    {
        "SuccessfulFleetRequests": [
            {
                "SpotFleetRequestId": "sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE",
                "CurrentSpotFleetRequestState": "cancelled_terminating",
                "PreviousSpotFleetRequestState": "active"
            }
        ],
        "UnsuccessfulFleetRequests": []
    }

**Example 2: To cancel a Spot fleet request without terminating the associated instances**

The following ``cancel-spot-fleet-requests`` example cancels a Spot Fleet request without terminating the associated On-Demand Instances and Spot Instances. ::

    aws ec2 cancel-spot-fleet-requests \
        --spot-fleet-request-ids sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE \
        --no-terminate-instances

Output::

    {
        "SuccessfulFleetRequests": [
            {
                "SpotFleetRequestId": "sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE",
                "CurrentSpotFleetRequestState": "cancelled_running",
                "PreviousSpotFleetRequestState": "active"
            }
        ],
        "UnsuccessfulFleetRequests": []  
    }

For more information, see `Cancel a Spot Fleet request <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cancel-spot-fleet.html>`__ in the *Amazon EC2 User Guide*.