**To group the aggregated values that match the query into percentile groupings**

You can use the following setup script to create 10 things representing 10 temperature sensors. Each new thing has 1 attribute. ::

    # Bash script. If in other shells, type `bash` before running
    Temperatures=(70 71 72 73 74 75 47 97 98 99)
    for ((i=0; i<10 ; i++))
    do
        thing=$(aws iot create-thing --thing-name "TempSensor$i" --attribute-payload attributes="{temperature=${Temperatures[i]}}")
        aws iot describe-thing --thing-name "TempSensor$i"
    done

Example output of the setup script::

    {
        "version": 1, 
        "thingName": "TempSensor0", 
        "defaultClientId": "TempSensor0", 
        "attributes": {
            "temperature": "70"
        }, 
        "thingArn": "arn:aws:iot:us-east-1:123456789012:thing/TempSensor0", 
        "thingId": "example1-90ab-cdef-fedc-ba987example"
    }

The following ``get-percentiles`` example queries the 10 sensors created by the setup script and returns a value for each percentile group specified. The percentile group "10" contains the aggregated field value that occurs in approximately 10 percent of the values that match the query. In the following output, {"percent": 10.0, "value": 67.7} means approximately 10.0% of the temperature values are below 67.7. ::

    aws iot get-percentiles \
        --aggregation-field "attributes.temperature" \
        --query-string "thingName:TempSensor*" \
        --percents 10 25 50 75 90

Output::

    {
        "percentiles": [
            {
                "percent": 10.0, 
                "value": 67.7
            }, 
            {
                "percent": 25.0, 
                "value": 71.25
            }, 
            {
                "percent": 50.0, 
                "value": 73.5
            }, 
            {
                "percent": 75.0, 
                "value": 91.5
            }, 
            {
                "percent": 90.0, 
                "value": 98.1
            }
        ]
    }

For more information, see `Querying for Aggregate Data <https://docs.aws.amazon.com/iot/latest/developerguide/index-aggregate.html>`__ in the *AWS IoT Developer Guide*.
