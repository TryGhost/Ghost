**Example 1: To delete an EC2 Fleet and terminate the associated instances**

The following ``delete-fleets`` example deletes the specified EC2 Fleet and terminates the associated On-Demand Instances and Spot Instances. ::

    aws ec2 delete-fleets \
        --fleet-ids fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE \
        --terminate-instances

Output::

    {
        "SuccessfulFleetDeletions": [
            {
                "CurrentFleetState": "deleted_terminating",
                "PreviousFleetState": "active",
                "FleetId": "fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE"
            }
        ],
        "UnsuccessfulFleetDeletions": []
    }

For more information, see `Delete an EC2 Fleet <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-ec2-fleet.html#delete-fleet>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.

**Example 2: To delete an EC2 Fleet without terminating the associated instances**

The following ``delete-fleets`` example deletes the specified EC2 Fleet without terminating the associated On-Demand Instances and Spot Instances. ::

    aws ec2 delete-fleets \
        --fleet-ids fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE \
        --no-terminate-instances

Output::

    {
        "SuccessfulFleetDeletions": [
            {
                "CurrentFleetState": "deleted_running",
                "PreviousFleetState": "active",
                "FleetId": "fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE"
            }
        ],
        "UnsuccessfulFleetDeletions": []
    }

For more information, see `Delete an EC2 Fleet <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-ec2-fleet.html#delete-fleet>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.