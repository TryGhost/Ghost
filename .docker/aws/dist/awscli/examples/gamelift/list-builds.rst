**Example1: To get a list of custom game builds**

The following ``list-builds`` example retrieves properties for all game server builds in the current Region. The sample request illustrates how to use the pagination parameters, ``Limit`` and ``NextToken``, to retrieve the results in sequential sets. The first command retrieves the first two builds. Because there are more than two available, the response includes a ``NextToken`` to indicate that more results are available. ::

    aws gamelift list-builds \
        --limit 2

Output::

    {
        "Builds": [
            {
                "BuildArn": "arn:aws:gamelift:us-west-2::build/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "BuildId": "build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111", 
                "CreationTime": 1495664528.723, 
                "Name": "My_Game_Server_Build_One", 
                "OperatingSystem": "WINDOWS_2012", 
                "SizeOnDisk": 8567781, 
                "Status": "READY", 
                "Version": "12345.678"
            }, 
            {
                "BuildArn": "arn:aws:gamelift:us-west-2::build/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "BuildId": "build-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222", 
                "CreationTime": 1495528748.555, 
                "Name": "My_Game_Server_Build_Two", 
                "OperatingSystem": "AMAZON_LINUX_2",
                "SizeOnDisk": 8567781,
                "Status": "FAILED", 
                "Version": "23456.789"
            }
        ], 
        "NextToken": "eyJhd3NBY2NvdW50SWQiOnsicyI6IjMwMjc3NjAxNjM5OCJ9LCJidWlsZElkIjp7InMiOiJidWlsZC01NWYxZTZmMS1jY2FlLTQ3YTctOWI5ZS1iYjFkYTQwMjJEXAMPLE="
    }

You can then call the command again with the ``--next-token`` parameter as follows to see the next two builds. ::

    aws gamelift list-builds \
        --limit 2
        --next-token eyJhd3NBY2NvdW50SWQiOnsicyI6IjMwMjc3NjAxNjM5OCJ9LCJidWlsZElkIjp7InMiOiJidWlsZC01NWYxZTZmMS1jY2FlLTQ3YTctOWI5ZS1iYjFkYTQwMjJEXAMPLE=

Repeat until the response doesn't include a ``NextToken`` value.

**Example2: To get a list of custom game builds in failure status**

The following ``list-builds`` example retrieves properties for all game server builds in the current region that currently have status FAILED. ::

    aws gamelift list-builds \
        --status FAILED

Output::

    {
        "Builds": [
            {
                "BuildArn": "arn:aws:gamelift:us-west-2::build/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "BuildId": "build-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222", 
                "CreationTime": 1495528748.555, 
                "Name": "My_Game_Server_Build_Two", 
                "OperatingSystem": "AMAZON_LINUX_2",
                "SizeOnDisk": 8567781,
                "Status": "FAILED", 
                "Version": "23456.789"
            }
        ]
    }

