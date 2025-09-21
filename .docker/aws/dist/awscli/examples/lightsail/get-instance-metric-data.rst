**To get metric data for an instance**

The following ``get-instance-metric-data`` example returns the average percent of ``CPUUtilization`` every ``7200`` seconds (2 hours) between ``1571342400`` and ``1571428800`` for instance ``MEAN-1``.

We recommend that you use a unix time converter to identify the start and end times. ::

    aws lightsail get-instance-metric-data \
        --instance-name MEAN-1 \
        --metric-name CPUUtilization \
        --period 7200 \
        --start-time 1571342400 \
        --end-time 1571428800 \
        --unit Percent \
        --statistics Average

Output::

    {
        "metricName": "CPUUtilization",
        "metricData": [
            {
                "average": 0.26113718770120725,
                "timestamp": 1571342400.0,
                "unit": "Percent"
            },
            {
                "average": 0.26861268928111953,
                "timestamp": 1571392800.0,
                "unit": "Percent"
            },
            {
                "average": 0.28187475104748777,
                "timestamp": 1571378400.0,
                "unit": "Percent"
            },
            {
                "average": 0.2651936960458352,
                "timestamp": 1571421600.0,
                "unit": "Percent"
            },
            {
                "average": 0.2561856213712188,
                "timestamp": 1571371200.0,
                "unit": "Percent"
            },
            {
                "average": 0.3021383254607764,
                "timestamp": 1571356800.0,
                "unit": "Percent"
            },
            {
                "average": 0.2618381649223539,
                "timestamp": 1571407200.0,
                "unit": "Percent"
            },
            {
                "average": 0.26331929394825787,
                "timestamp": 1571400000.0,
                "unit": "Percent"
            },
            {
                "average": 0.2576348407007818,
                "timestamp": 1571385600.0,
                "unit": "Percent"
            },
            {
                "average": 0.2513008454658378,
                "timestamp": 1571364000.0,
                "unit": "Percent"
            },
            {
                "average": 0.26329974562758346,
                "timestamp": 1571414400.0,
                "unit": "Percent"
            },
            {
                "average": 0.2667092536656445,
                "timestamp": 1571349600.0,
                "unit": "Percent"
            }
        ]
    }
