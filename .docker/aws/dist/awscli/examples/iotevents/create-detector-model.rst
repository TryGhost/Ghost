**To create a detector model**

The following ``create-detector-model`` example creates a detector model with its configuration specified by a parameter file. ::

    aws iotevents create-detector-model  \
        --cli-input-json file://motorDetectorModel.json

Contents of ``motorDetectorModel.json``::

    {
        "detectorModelName": "motorDetectorModel",
        "detectorModelDefinition": {
            "states": [
                {
                    "stateName": "Normal",
                    "onEnter": {
                        "events": [
                            {
                                "eventName": "init",
                                "condition": "true",
                                "actions": [
                                    {
                                        "setVariable": {
                                            "variableName": "pressureThresholdBreached",
                                            "value": "0"
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    "onInput": {
                        "transitionEvents": [
                            {
                                "eventName": "Overpressurized",
                                "condition": "$input.PressureInput.sensorData.pressure &gt; 70",
                                "actions": [
                                    {
                                        "setVariable": {
                                            "variableName": "pressureThresholdBreached",
                                            "value": "$variable.pressureThresholdBreached + 3"
                                        }
                                    }
                                ],
                                "nextState": "Dangerous"
                            }
                        ]
                    }
                },
                {
                    "stateName": "Dangerous",
                    "onEnter": {
                        "events": [
                            {
                                "eventName": "Pressure Threshold Breached",
                                "condition": "$variable.pressureThresholdBreached &gt; 1",
                                "actions": [
                                    {
                                        "sns": {
                                            "targetArn": "arn:aws:sns:us-east-1:123456789012:underPressureAction"
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    "onInput": {
                        "events": [
                            {
                                "eventName": "Overpressurized",
                                "condition": "$input.PressureInput.sensorData.pressure &gt; 70",
                                "actions": [
                                    {
                                        "setVariable": {
                                            "variableName": "pressureThresholdBreached",
                                            "value": "3"
                                        }
                                    }
                                ]
                            },
                            {
                                "eventName": "Pressure Okay",
                                "condition": "$input.PressureInput.sensorData.pressure &lt;= 70",
                                "actions": [
                                    {
                                        "setVariable": {
                                            "variableName": "pressureThresholdBreached",
                                            "value": "$variable.pressureThresholdBreached - 1"
                                        }
                                    }
                                ]
                            }
                        ],
                        "transitionEvents": [
                            {
                                "eventName": "BackToNormal",
                                "condition": "$input.PressureInput.sensorData.pressure &lt;= 70 &amp;&amp; $variable.pressureThresholdBreached &lt;= 1",
                                "nextState": "Normal"
                            }
                        ]
                    },
                    "onExit": {
                        "events": [
                            {
                                "eventName": "Normal Pressure Restored",
                                "condition": "true",
                                "actions": [
                                    {
                                        "sns": {
                                            "targetArn": "arn:aws:sns:us-east-1:123456789012:pressureClearedAction"
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            ],
            "initialStateName": "Normal"
        },
        "key": "motorid",
        "roleArn": "arn:aws:iam::123456789012:role/IoTEventsRole"
    }

Output::

    {
        "detectorModelConfiguration": {
            "status": "ACTIVATING", 
            "lastUpdateTime": 1560796816.077, 
            "roleArn": "arn:aws:iam::123456789012:role/IoTEventsRole", 
            "creationTime": 1560796816.077, 
            "detectorModelArn": "arn:aws:iotevents:us-west-2:123456789012:detectorModel/motorDetectorModel", 
            "key": "motorid", 
            "detectorModelName": "motorDetectorModel", 
            "detectorModelVersion": "1"
        }
    }

For more information, see `CreateDetectorModel <https://docs.aws.amazon.com/iotevents/latest/apireference/API_CreateDetectorModel.html>`__ in the *AWS IoT Events API Reference*.
