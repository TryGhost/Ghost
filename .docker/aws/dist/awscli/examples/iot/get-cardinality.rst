**To return the approximate count of unique values that match the query**

You can use the following setup script to create 10 things representing 10 temperature sensors. Each new thing has 3 attributes. ::

    # Bash script. If in other shells, type `bash` before running
    Temperatures=(70 71 72 73 74 75 47 97 98 99)
    Racks=(Rack1 Rack1 Rack2 Rack2 Rack3 Rack4 Rack5 Rack6 Rack6 Rack6)
    IsNormal=(true true true true true true false false false false)
    for ((i=0; i<10 ; i++))
    do
      thing=$(aws iot create-thing --thing-name "TempSensor$i" --attribute-payload attributes="{temperature=${Temperatures[i]},rackId=${Racks[i]},stateNormal=${IsNormal[i]}}")
      aws iot describe-thing --thing-name "TempSensor$i"
    done

Example output of the setup script::

    {
        "version": 1, 
        "thingName": "TempSensor0", 
        "defaultClientId": "TempSensor0", 
        "attributes": {
            "rackId": "Rack1", 
            "stateNormal": "true", 
            "temperature": "70"
        }, 
        "thingArn": "arn:aws:iot:us-east-1:123456789012:thing/TempSensor0", 
        "thingId": "example1-90ab-cdef-fedc-ba987example"
    }

The following ``get-cardinality`` example queries the 10 sensors created by the setup script and returns the number of racks that have temperature sensors reporting abnormal temperature values. If the temperature value is below 60 or above 80, the temperature sensor is in an abnormal state. ::

    aws iot get-cardinality \
        --aggregation-field "attributes.rackId" \
        --query-string "thingName:TempSensor* AND attributes.stateNormal:false"

Output::

    {
        "cardinality": 2
    }

For more information, see `Querying for Aggregate Data<https://docs.aws.amazon.com/iot/latest/developerguide/index-aggregate.html>`__ in the *AWS IoT Developer Guide*.
