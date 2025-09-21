**To delete a traffic mirror target**

The following ``delete-traffic-mirror-target`` example deletes the specified traffic mirror target. ::

    aws ec2 delete-traffic-mirror-target \
        --traffic-mirror-target-id tmt-060f48ce9EXAMPLE
        
Output::

    {
        "TrafficMirrorTargetId": "tmt-060f48ce9EXAMPLE"
    }

For more information, see `Delete a Traffic Mirror Target <https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-target.html#delete-traffic-mirroring-target>`__ in the *AWS Traffic Mirroring Guide*.
