**Example1: To get a list of all fleets in a Region**

The following ``list-fleets`` example displays the fleet IDs of all fleets in the current Region. This example uses pagination parameters to retrieve two fleet IDs at a time. The response includes a ``next-token`` attribute, which indicates that there are more results to retrieve. ::

    aws gamelift list-fleets \
        --limit 2

Output::

    {
        "FleetIds": [
            "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"
        ],
        "NextToken": "eyJhd3NBY2NvdW50SWQiOnsicyI6IjMwMjc3NjAxNjM5OCJ9LCJidWlsZElkIjp7InMiOiJidWlsZC01NWYxZTZmMS1jY2FlLTQ3YTctOWI5ZS1iYjFkYTQwMjJEXAMPLE="
    }

You can pass the ``NextToken`` value from the previous response in the next command, as shown here to get the next two results. ::

    aws gamelift list-fleets \
        --limit 2 \
        --next-token eyJhd3NBY2NvdW50SWQiOnsicyI6IjMwMjc3NjAxNjM5OCJ9LCJidWlsZElkIjp7InMiOiJidWlsZC00NDRlZjQxZS1hM2I1LTQ2NDYtODJmMy0zYzI4ZTgxNjVjEXAMPLE=

**Example2: To get a list of all fleets in a Region with a specific build or script**

The following ``list-builds`` example retrieves the IDs of fleets that are deployed with the specified game build. If you're working with Realtime Servers, you can provide a script ID in place of a build ID. Because this example does not specify the limit parameter, the results can include up to 16 fleet IDs. ::

    aws gamelift list-fleets \
        --build-id build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "FleetIds": [
            "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
            "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE44444"
        ]
    }
