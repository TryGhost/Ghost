**To get log events for a relational database**

The following ``get-relational-database-log-events`` example displays details about the specified log between ``1570733176`` and ``1571597176`` for relational database ``Database1``. The information returned is configured to start from ``head``.

We recommend that you use a unix time converter to identify the start and end times. ::

    aws lightsail get-relational-database-log-events \
        --relational-database-name Database1 \
        --log-stream-name error \
        --start-from-head \
        --start-time 1570733176 \
        --end-time 1571597176

Output::

    {
        "resourceLogEvents": [
            {
                "createdAt": 1570820267.0,
                "message": "2019-10-11 18:57:47 20969 [Warning] IP address '192.0.2.0' could not be resolved: Name or service not known"
            },
            {
                "createdAt": 1570860974.0,
                "message": "2019-10-12 06:16:14 20969 [Warning] IP address '8192.0.2.0' could not be resolved: Temporary failure in name resolution"
            },
            {
                "createdAt": 1570860977.0,
                "message": "2019-10-12 06:16:17 20969 [Warning] IP address '192.0.2.0' could not be resolved: Temporary failure in name resolution"
            },
            {
                "createdAt": 1570860979.0,
                "message": "2019-10-12 06:16:19 20969 [Warning] IP address '192.0.2.0' could not be resolved: Temporary failure in name resolution"
            },
            {
                "createdAt": 1570860981.0,
                "message": "2019-10-12 06:16:21 20969 [Warning] IP address '192.0.2.0' could not be resolved: Temporary failure in name resolution"
            },
            {
                "createdAt": 1570860982.0,
                "message": "2019-10-12 06:16:22 20969 [Warning] IP address '192.0.2.0' could not be resolved: Temporary failure in name resolution"
            },
            {
                "createdAt": 1570860984.0,
                "message": "2019-10-12 06:16:24 20969 [Warning] IP address '192.0.2.0' could not be resolved: Temporary failure in name resolution"
            },
            {
                "createdAt": 1570860986.0,
                "message": "2019-10-12 06:16:26 20969 [Warning] IP address '192.0.2.0' could not be resolved: Temporary failure in name resolution"
            },
            ...
            }
        ],
        "nextBackwardToken": "eEXAMPLEZXJUZXh0IjoiZnRWb3F3cUpRSlQ5NndMYThxelRUZlFhR3J6c2dKWEEvM2kvajZMZzVVVWpqRDN0YjFXTjNrak5pRk9iVFRZdjkwVGlpZGw5NFJGSFRQTEdJSjdpQnFCRk5CZFJlYTZaSXpScStuZjJEYXhqM2grUFVJOEpIYlU5YWJ2QitvQWN5cEFyVUo3VDk1QWY3bVF6MEwvcVovVldZdGc9Iiwibm9uY2UiOiJBNHpzdWMvUkZZKzRvUzhEIiwiY2lwaGVyIjoiQUVTL0dDTS9Ob1BhZGEXAMPLEQ==",
        "nextForwardToken": "eEXAMPLEZXJUZXh0IjoiT09Lb0Z6ZFRJbHhaNEQ5N2tPbkkwRmwwNUxPZjFTbFFwUklQbzlSaWgvMWVXbEk4aG56VHg4bW1Gb3grbDVodUVNZEdiZXN0TzVYcjlLK1FUdFB2RlJLS2FMcU05WkN3Rm1uVzBkOFpDR2g0b1BBVlg2NVFGNDNPazZzRXJieHRuU0xzdkRNTkFUMTZibU9HM2YyaGxiS0hUUDA9Iiwibm9uY2UiOiJFQmI4STQ3cU5aWXNXZ0g4IiwiY2lwaGVyIjoiQUVTL0dDTS9Ob1BhZGEXAMPLEQ=="
    }
