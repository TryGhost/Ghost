**Listing Activity Types**

To get a list of the activity types for a domain, use ``swf list-activity-types``. The ``--domain`` and
``--registration-status`` arguments are required. ::

    aws swf list-activity-types \
        --domain DataFrobtzz \
        --registration-status REGISTERED

Output::

    {
        "typeInfos": [
            {
                "status": "REGISTERED",
                "creationDate": 1371454150.451,
                "activityType": {
                    "version": "1",
                    "name": "confirm-user-email"
                },
                "description": "subscribe confirm-user-email activity"
            },
            {
                "status": "REGISTERED",
                "creationDate": 1371454150.709,
                "activityType": {
                    "version": "1",
                    "name": "confirm-user-phone"
                },
                "description": "subscribe confirm-user-phone activity"
            },
            {
                "status": "REGISTERED",
                "creationDate": 1371454149.871,
                "activityType": {
                    "version": "1",
                    "name": "get-subscription-info"
                },
                "description": "subscribe get-subscription-info activity"
            },
            {
                "status": "REGISTERED",
                "creationDate": 1371454150.909,
                "activityType": {
                    "version": "1",
                    "name": "send-subscription-success"
                },
                "description": "subscribe send-subscription-success activity"
            },
            {
                "status": "REGISTERED",
                "creationDate": 1371454150.085,
                "activityType": {
                    "version": "1",
                    "name": "subscribe-user-sns"
                },
                "description": "subscribe subscribe-user-sns activity"
            }
        ]
    }

You can use the ``--name`` argument to select only activity types with a particular name::

    aws swf list-activity-types \
        --domain DataFrobtzz \
        --registration-status REGISTERED \
        --name "send-subscription-success"

Output::

    {
        "typeInfos": [
            {
                "status": "REGISTERED",
                "creationDate": 1371454150.909,
                "activityType": {
                    "version": "1",
                    "name": "send-subscription-success"
                },
                "description": "subscribe send-subscription-success activity"
            }
        ]
    }

To retrieve results in pages, you can set the ``--maximum-page-size`` argument. If more results are returned than will
fit in a page of results, a "nextPageToken" will be returned in the result set::

    aws swf list-activity-types \
        --domain DataFrobtzz \
        --registration-status REGISTERED \
        --maximum-page-size 2

Output::

    {
        "nextPageToken": "AAAAKgAAAAEAAAAAAAAAA1Gp1BelJq+PmHvAnDxJYbup8+0R4LVtbXLDl7QNY7C3OpHo9Sz06D/GuFz1OyC73umBQ1tOPJ/gC/aYpzDMqUIWIA1T9W0s2DryyZX4OC/6Lhk9/o5kdsuWMSBkHhgaZjgwp3WJINIFJFdaSMxY2vYAX7AtRtpcqJuBDDRE9RaRqDGYqIYUMltarkiqpSY1ZVveBasBvlvyUb/WGAaqehiDz7/JzLT/wWNNUMOd+Nhe",
        "typeInfos": [
            {
                "status": "REGISTERED",
                "creationDate": 1371454150.451,
                "activityType": {
                    "version": "1",
                    "name": "confirm-user-email"
                },
                "description": "subscribe confirm-user-email activity"
            },
            {
                "status": "REGISTERED",
                "creationDate": 1371454150.709,
                "activityType": {
                    "version": "1",
                    "name": "confirm-user-phone"
                },
                "description": "subscribe confirm-user-phone activity"
            }
        ]
    }

You can pass the nextPageToken value to the next call to ``list-activity-types`` in the ``--next-page-token`` argument, retrieving the next page of results::

    aws swf list-activity-types \
        --domain DataFrobtzz \
        --registration-status REGISTERED \
        --maximum-page-size 2 \
        --next-page-token "AAAAKgAAAAEAAAAAAAAAA1Gp1BelJq+PmHvAnDxJYbup8+0R4LVtbXLDl7QNY7C3OpHo9Sz06D/GuFz1OyC73umBQ1tOPJ/gC/aYpzDMqUIWIA1T9W0s2DryyZX4OC/6Lhk9/o5kdsuWMSBkHhgaZjgwp3WJINIFJFdaSMxY2vYAX7AtRtpcqJuBDDRE9RaRqDGYqIYUMltarkiqpSY1ZVveBasBvlvyUb/WGAaqehiDz7/JzLT/wWNNUMOd+Nhe"

Output::

    {
        "nextPageToken": "AAAAKgAAAAEAAAAAAAAAAw+7LZ4GRZPzTqBHsp2wBxWB8m1sgLCclgCuq3J+h/m3+vOfFqtkcjLwV5cc4OjNAzTCuq/XcylPumGwkjbajtqpZpbqOcVNfjFxGoi0LB2Olbvv0krbUISBvlpFPmSWpDSZJsxg5UxCcweteSlFn1PNSZ/MoinBZo8OTkjMuzcsTuKOzH9wCaR8ITcALJ3SaqHU3pyIRS5hPmFA3OLIc8zaAepjlaujo6hntNSCruB4"
        "typeInfos": [
            {
                "status": "REGISTERED",
                "creationDate": 1371454149.871,
                "activityType": {
                    "version": "1",
                    "name": "get-subscription-info"
                },
                "description": "subscribe get-subscription-info activity"
            },
            {
                "status": "REGISTERED",
                "creationDate": 1371454150.909,
                "activityType": {
                    "version": "1",
                    "name": "send-subscription-success"
                },
                "description": "subscribe send-subscription-success activity"
            }
        ]
    }

If there are still more results to return, "nextPageToken" will be returned with the results. When there are no more
pages of results to return, "nextPageToken" will *not* be returned in the result set.

You can use the ``--reverse-order`` argument to reverse the order of the returned results. This also affects paged results. ::

    aws swf list-activity-types \
        --domain DataFrobtzz \
        --registration-status REGISTERED \
        --maximum-page-size 2 \
        --reverse-order

Output::

    {
        "nextPageToken": "AAAAKgAAAAEAAAAAAAAAAwXcpu5ePSyQkrC+8WMbmSrenuZC2ZkIXQYBPB/b9xIOVkj+bMEFhGj0KmmJ4rF7iddhjf7UMYCsfGkEn7mk+yMCgVc1JxDWmB0EH46bhcmcLmYNQihMDmUWocpr7To6/R7CLu0St1gkFayxOidJXErQW0zdNfQaIWAnF/cwioBbXlkz1fQzmDeU3M5oYGMPQIrUqkPq7pMEW0q0lK5eDN97NzFYdZZ/rlcLDWPZhUjY",
        "typeInfos": [
            {
                "status": "REGISTERED",
                "creationDate": 1371454150.085,
                "activityType": {
                    "version": "1",
                    "name": "subscribe-user-sns"
                },
                "description": "subscribe subscribe-user-sns activity"
            },
            {
                "status": "REGISTERED",
                "creationDate": 1371454150.909,
                "activityType": {
                    "version": "1",
                    "name": "send-subscription-success"
                },
                "description": "subscribe send-subscription-success activity"
            }
        ]
    }

See Also
--------

-  `ListActivityTypes <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_ListActivityTypes.html>`_
   in the *Amazon Simple Workflow Service API Reference*

