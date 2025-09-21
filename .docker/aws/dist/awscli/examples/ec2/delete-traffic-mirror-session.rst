**To delete a traffic mirror session**

The following ``delete-traffic-mirror-session`` example deletes the specified traffic mirror-session. ::

    aws ec2 delete-traffic-mirror-session \
        --traffic-mirror-session-id tms-0af3141ce5EXAMPLE

Output::

    {
        "TrafficMirrorSessionId": "tms-0af3141ce5EXAMPLE"
    }

For more information, see `Delete a Traffic Mirror Session <https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-session.html#delete-traffic-mirroring-session>`__ in the *AWS Traffic Mirroring Guide*.
