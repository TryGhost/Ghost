**To restart fleet automatic scaling activity**

The following ``start-fleet-actions`` example resumes the use of all scaling policies that are defined for the specified fleet but were stopped by calling``stop-fleet-actions``. After starting, the scaling policies immediately begin tracking their respective metrics. ::

    aws gamelift start-fleet-actions \
        --fleet-id fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \ 
        --actions AUTO_SCALING

This command produces no output.
