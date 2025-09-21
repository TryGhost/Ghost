**To get metric data for a relational database**

The following ``get-relational-database-metric-data`` example returns the count sum of the metric ``DatabaseConnections`` over the period of 24 hours (``86400`` seconds) between ``1570733176`` and ``1571597176`` for relational database ``Database1``.

We recommend that you use a unix time converter to identify the start and end times. ::

    aws lightsail get-relational-database-metric-data \
        --relational-database-name Database1 \
        --metric-name DatabaseConnections \
        --period 86400 \
        --start-time 1570733176 \
        --end-time 1571597176 \
        --unit Count \
        --statistics Sum

Output::

    {
        "metricName": "DatabaseConnections",
        "metricData": [
            {
                "sum": 1.0,
                "timestamp": 1571510760.0,
                "unit": "Count"
            },
            {
                "sum": 1.0,
                "timestamp": 1570733160.0,
                "unit": "Count"
            },
            {
                "sum": 1.0,
                "timestamp": 1570992360.0,
                "unit": "Count"
            },
            {
                "sum": 0.0,
                "timestamp": 1571251560.0,
                "unit": "Count"
            },
            {
                "sum": 721.0,
                "timestamp": 1570819560.0,
                "unit": "Count"
            },
            {
                "sum": 1.0,
                "timestamp": 1571078760.0,
                "unit": "Count"
            },
            {
                "sum": 2.0,
                "timestamp": 1571337960.0,
                "unit": "Count"
            },
            {
                "sum": 684.0,
                "timestamp": 1570905960.0,
                "unit": "Count"
            },
            {
                "sum": 0.0,
                "timestamp": 1571165160.0,
                "unit": "Count"
            },
            {
                "sum": 1.0,
                "timestamp": 1571424360.0,
                "unit": "Count"
            }
        ]
    }
