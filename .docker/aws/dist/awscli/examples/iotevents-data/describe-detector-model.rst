**To get information about a detector model**

The following ``describe-detector-model`` example describes a detector model. If the ``version`` parameter is not specified, the command returns information about the latest version. ::

    aws iotevents describe-detector-model \
        --detector-model-name motorDetectorModel

Output::

    {
        "detectorModel": {
            "detectorModelConfiguration": {
                "status": "ACTIVE", 
                "lastUpdateTime": 1560796816.077, 
                "roleArn": "arn:aws:iam::123456789012:role/IoTEventsRole", 
                "creationTime": 1560796816.077, 
                "detectorModelArn": "arn:aws:iotevents:us-west-2:123456789012:detectorModel/motorDetectorModel", 
                "key": "motorid", 
                "detectorModelName": "motorDetectorModel", 
                "detectorModelVersion": "1"
            }, 
            "detectorModelDefinition": {
                "states": [
                    {
                        "onInput": {
                            "transitionEvents": [
                                {
                                    "eventName": "Overpressurized", 
                                    "actions": [
                                        {
                                            "setVariable": {
                                                "variableName": "pressureThresholdBreached", 
                                                "value": "$variable.pressureThresholdBreached + 3"
                                            }
                                        }
                                    ], 
                                    "condition": "$input.PressureInput.sensorData.pressure > 70", 
                                    "nextState": "Dangerous"
                                }
                            ], 
                            "events": []
                        }, 
                        "stateName": "Normal", 
                        "onEnter": {
                            "events": [
                                {
                                    "eventName": "init", 
                                    "actions": [
                                        {
                                            "setVariable": {
                                                "variableName": "pressureThresholdBreached", 
                                                "value": "0"
                                            }
                                        }
                                    ], 
                                    "condition": "true"
                                }
                            ]
                        }, 
                        "onExit": {
                            "events": []
                        }
                    }, 
                    {
                        "onInput": {
                            "transitionEvents": [
                                {
                                    "eventName": "BackToNormal", 
                                    "actions": [], 
                                    "condition": "$input.PressureInput.sensorData.pressure <= 70 && $variable.pressureThresholdBreached <= 1", 
                                    "nextState": "Normal"
                                }
                            ], 
                            "events": [
                                {
                                    "eventName": "Overpressurized", 
                                    "actions": [
                                        {
                                            "setVariable": {
                                                "variableName": "pressureThresholdBreached", 
                                                "value": "3"
                                            }
                                        }
                                    ], 
                                    "condition": "$input.PressureInput.sensorData.pressure > 70"
                                }, 
                                {
                                    "eventName": "Pressure Okay", 
                                    "actions": [
                                        {
                                            "setVariable": {
                                                "variableName": "pressureThresholdBreached", 
                                                "value": "$variable.pressureThresholdBreached - 1"
                                            }
                                        }
                                    ], 
                                    "condition": "$input.PressureInput.sensorData.pressure <= 70"
                                }
                            ]
                        }, 
                        "stateName": "Dangerous", 
                        "onEnter": {
                            "events": [
                                {
                                    "eventName": "Pressure Threshold Breached", 
                                    "actions": [
                                        {
                                            "sns": {
                                                "targetArn": "arn:aws:sns:us-east-1:123456789012:underPressureAction"
                                            }
                                        }
                                    ], 
                                    "condition": "$variable.pressureThresholdBreached > 1"
                                }
                            ]
                        }, 
                        "onExit": {
                            "events": [
                                {
                                    "eventName": "Normal Pressure Restored", 
                                    "actions": [
                                        {
                                            "sns": {
                                                "targetArn": "arn:aws:sns:us-east-1:123456789012:pressureClearedAction"
                                            }
                                        }
                                    ], 
                                    "condition": "true"
                                }
                            ]
                        }
                    }
                ], 
                "initialStateName": "Normal"
            }
        }
    }

For more information, see `DescribeDetectorModel <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-DescribeDetectorModel>`__ in the *AWS IoT Events Developer Guide**.

