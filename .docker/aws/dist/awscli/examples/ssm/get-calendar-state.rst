**Example 1: To get the current state of a change calendar**

This ``get-calendar-state`` example returns the state of a calendar at the current time. Because the example doesn't specify a time, the current state of the calendar is reported. ::

    aws ssm get-calendar-state \
        --calendar-names "MyCalendar"

Output::

    {
        "State": "OPEN",
        "AtTime": "2020-02-19T22:28:51Z",
        "NextTransitionTime": "2020-02-24T21:15:19Z"
    }

**Example 2: To get the state of a change calendar at a specified time**

This ``get-calendar-state`` example returns the state of a calendar at the specified time. ::

    aws ssm get-calendar-state \
        --calendar-names "MyCalendar" \
        --at-time "2020-07-19T21:15:19Z"

Output::

    {
        "State": "CLOSED",
        "AtTime": "2020-07-19T21:15:19Z"
    }

For more information, see `Get the State of the Change Calendar <https://docs.aws.amazon.com/systems-manager/latest/userguide/change-calendar-getstate.html>`_ in the *AWS Systems Manager User Guide*.
