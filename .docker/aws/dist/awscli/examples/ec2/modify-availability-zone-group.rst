**To enable a zone group**

The following ``modify-availability-zone-group`` example enables the specified zone group. ::

    aws ec2 modify-availability-zone-group \
        --group-name us-west-2-lax-1 \
        --opt-in-status opted-in

Output::

    {
        "Return": true
    }

For more information, see `Regions and Zones <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html>`__ in the *Amazon EC2 User Guide*.
