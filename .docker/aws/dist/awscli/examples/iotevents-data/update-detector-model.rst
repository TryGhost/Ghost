**To update a detector model**

The following ``update-detector-model`` example updates a detector model. Detectors (instances) spawned by the previous version are deleted and then re-created as new inputs arrive. ::

    aws iotevents update-detector-model \
        --cli-input-json file://motorDetectorModel.update.json

Contents of motorDetectorModel.update.json::

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
                "condition": "$input.PressureInput.sensorData.pressure > 70",
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
                "condition": "$variable.pressureThresholdBreached > 1",
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
                "condition": "$input.PressureInput.sensorData.pressure > 70",
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
                "condition": "$input.PressureInput.sensorData.pressure <= 70",
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
                "condition": "$input.PressureInput.sensorData.pressure <= 70 && $variable.pressureThresholdBreached <= 1",
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
    "roleArn": "arn:aws:iam::123456789012:role/IoTEventsRole"
  }

Output::

    {
        "detectorModelConfiguration": {
            "status": "ACTIVATING", 
            "lastUpdateTime": 1560799387.719, 
            "roleArn": "arn:aws:iam::123456789012:role/IoTEventsRole", 
            "creationTime": 1560799387.719, 
            "detectorModelArn": "arn:aws:iotevents:us-west-2:123456789012:detectorModel/motorDetectorModel", 
            "key": "motorid", 
            "detectorModelName": "motorDetectorModel", 
            "detectorModelVersion": "2"
        }
    }

For more information, see `UpdateDetectorModel <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-UpdateDetectorModel>`__ in the *AWS IoT Events Developer Guide**.

