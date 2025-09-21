**To delete a fleet that is no longer in use**

The following ``delete-fleet`` example removes a fleet that has been scaled down to zero instances. If the fleet capacity is greater than zero, the request fails with an HTTP 400 error. ::

    aws gamelift delete-fleet \
       --fleet-id fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

This command produces no output.

For more information, see `Manage GameLift Fleets <https://docs.aws.amazon.com/gamelift/latest/developerguide/fleets-editing.html>`__ in the *Amazon GameLift Developer Guide*.
