**To list operations that meet the specified criteria**

The following ``list-operations`` example lists operations that have a status of ``PENDING`` or ``SUCCESS``. ::

    aws servicediscovery list-operations \
        --service-id srv-e4anhexample0004 \
        --filters Name=STATUS,Condition=IN,Values=PENDING,SUCCESS

Output::

    {
        "Operations": [
            {
                "Id": "76yy8ovhpdz0plmjzbsnqgnrqvpv2qdt-kexample",
                "Status": "SUCCESS"
            },
            {
                "Id": "prysnyzpji3u2ciy45nke83x2zanl7yk-dexample",
                "Status": "SUCCESS"
            },
            {
                "Id": "ko4ekftir7kzlbechsh7xvcdgcpk66gh-7example",
                "Status": "PENDING"
            }
        ]
    }


For more information, see `What is AWS Cloud Map? <https://docs.aws.amazon.com/cloud-map/latest/dg/what-is-cloud-map.html>`__ in the *AWS Cloud Map Developer Guide*.
