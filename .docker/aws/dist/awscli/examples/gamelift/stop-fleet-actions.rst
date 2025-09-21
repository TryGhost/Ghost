**To stop a fleet's automatic scaling activity**

The following ``stop-fleet-actions`` example stops the use of all scaling policies that are defined for the specified fleet. After the policies are suspended, fleet capacity remains at the same active instance count unless you adjust it manually.  ::

    aws gamelift start-fleet-actions \
        --fleet-id fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \ 
        --actions AUTO_SCALING

This command produces no output.

