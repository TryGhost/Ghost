**To get the log streams for a relational database**

The following ``get-relational-database-log-streams`` example returns all of the available log streams for the specified relational database. ::

    aws lightsail get-relational-database-log-streams \
    --relational-database-name Database1

Output::

    {
        "logStreams": [
            "audit",
            "error",
            "general",
            "slowquery"
        ]
    }
