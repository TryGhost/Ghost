**To delete a traffic mirror filter rule**

The following ``delete-traffic-mirror-filter-rule`` example deletes the specified traffic mirror filter rule. ::

    aws ec2 delete-traffic-mirror-filter-rule \
        --traffic-mirror-filter-rule-id tmfr-081f71283bEXAMPLE

Output::

    {
        "TrafficMirrorFilterRuleId": "tmfr-081f71283bEXAMPLE"
    }

For more information, see `Modify Your Traffic Mirror Filter Rules <https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-filter.html#modify-traffic-mirroring-filter-rules>`__ in the *AWS Traffic Mirroring Guide*.
