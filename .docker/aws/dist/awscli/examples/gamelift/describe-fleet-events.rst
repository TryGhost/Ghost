**To request events for a specified time span**

The following ``describe-fleet-events`` example diplays details of all fleet-related events that occurred during the specified time span. ::

    aws gamelift describe-fleet-events \
        --fleet-id arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --start-time 1579647600 \
        --end-time 1579649400 \
        --limit 5

Output:: 

    {
        "Events": [
            {
                "EventId": "a37b6892-5d07-4d3b-8b47-80244ecf66b9",
                "ResourceId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "EventCode": "FLEET_STATE_ACTIVE",
                "Message": "Fleet fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 changed state to ACTIVE",
                "EventTime": 1579649342.191
            },
            {
                "EventId": "67da4ec9-92a3-4d95-886a-5d6772c24063",
                "ResourceId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "EventCode": "FLEET_STATE_ACTIVATING",
                "Message": "Fleet fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 changed state to ACTIVATING",
                "EventTime": 1579649321.427
            },
            {
                "EventId": "23813a46-a9e6-4a53-8847-f12e6a8381ac",
                "ResourceId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "EventCode": "FLEET_STATE_BUILDING",
                "Message": "Fleet fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 changed state to BUILDING",
                "EventTime": 1579649321.243
            },
            {
                "EventId": "3bf217d0-1d44-42f9-9202-433ed475d2e8",
                "ResourceId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "EventCode": "FLEET_STATE_VALIDATING",
                "Message": "Fleet fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 changed state to VALIDATING",
                "EventTime": 1579649197.449
            },
            {
                "EventId": "2ecd0130-5986-44eb-99a7-62df27741084",
                "ResourceId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "EventCode": "FLEET_VALIDATION_LAUNCH_PATH_NOT_FOUND",
                "Message": "Failed to find a valid path",
                "EventTime": 1569319075.839,
                "PreSignedLogUrl": "https://gamelift-event-logs-prod-us-west-2.s3.us-west-2.amazonaws.com/logs/fleet-83422059-8329-42a2-a4d6-c4444386a6f8/events/2ecd0130-5986-44eb-99a7-62df27741084/FLEET_VALIDATION_LAUNCH_PATH_NOT_FOUND.txt?X-Amz-Security-Token=IQoJb3JpZ2luX2VjEB8aCXVzLXdlc3QtMiJHMEUCIHV5K%2FLPx8h310D%2FAvx0%2FZxsDy5XA3cJOwPdu3T0eBa%2FAiEA1yovokcZYy%2FV4CWW6l26aFyiSHO%2Bxz%2FBMAhEHYHMQNcqkQMImP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw3NDEwNjE1OTIxNzEiDI8rsZtzLzlwEDQhXSrlAtl5Ae%2Fgo6FCIzqXPbXfBOnSvFYqeDlriZarEpKqKrUt8mXQv9iqHResqCph9AKo49lwgSYTT2QoSxnrD7%2FUgv%2BZm2pVuczvuKtUA0fcx6s0GxpjIAzdIE%2F5P%2FB7B9M%2BVZ%2F9KF82hbJi0HTE6Y7BjKsEgFCvk4UXILhfjtan9iQl8%2F21ZTurAcJbm7Y5tuLF9SWSK3%2BEa7VXOcCK4D4O1sMjmdRm0q0CKZ%2FIaXoHkNvg0RVTa0hIqdvpaDQlsSBNdqTXbjHTu6fETE9Y9Ky%2BiJK5KiUG%2F59GjCpDcvS1FqKeLUEmKT7wysGmvjMc2n%2Fr%2F9VxQfte7w9srXwlLAQuwhiXAAyI5ICMZ5JvzjzQwTqD4CHTVKUUDwL%2BRZzbuuqkJObZml02CkRGp%2B74RTAzLbWptVqZTIfzctiCTmWxb%2FmKyELRYsVLrwNJ%2BGJ7%2BCrN0RC%2FjlgfLYIZyeAqjPgAu5HjgX%2BM7jCo9M7wBTrnAXKOFQuf9dvA84SuwXOJFp17LYGjrHMKv0qC3GfbTMrZ6kzeNV9awKCpXB2Gnx9z2KvIlJdqirWVpvHVGwKCmJBCesDzjJHrae3neogI1uW%2F9C6%2B4jIZPME3jXmZcEHqqw5uvAVF7aeIavtUZU8pxpDIWT0YE4p3Kriy2AA7ziCRKtVfjV839InyLk8LUjsioWK2qlpg2HXKFLpAXw1QsQyxYmFMB9sGKOUlbL7Jdkk%2BYUq8%2FDTlLxqj1S%2FiO4TI0Wo7ilAo%2FKKWWF4guuNDexj8EOOynSp1yImB%2BZf2Fua3O44W4eEXAMPLE33333&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20170621T231808Z&X-Amz-SignedHeaders=host&X-Amz-Expires=900&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20170621%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Signature=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            }
        ],
        "NextToken": "eyJhd3NBY2NvdW50SWQiOnsicyI6IjMwMjc3NjAxNjM5OCJ9LCJidWlsZElkIjp7InMiOiJidWlsZC01NWYxZTZmMS1jY2FlLTQ3YTctOWI5ZS1iYjFkYTQwMjEXAMPLE2"
    }

For more information, see `Debug GameLift Fleet Issues <https://docs.aws.amazon.com/gamelift/latest/developerguide/fleets-creating-debug.html>`__ in the *Amazon GameLift Developer Guide*.
