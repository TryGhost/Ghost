**To detect a label in an image**

The following ``detect-labels`` example detects scenes and objects in an image stored in an Amazon S3 bucket. ::

    aws rekognition detect-labels \
        --image '{"S3Object":{"Bucket":"bucket","Name":"image"}}' 

Output::

    {
        "Labels": [
            {
                "Instances": [],
                "Confidence": 99.15271759033203,
                "Parents": [
                    {
                        "Name": "Vehicle"
                    },
                    {
                        "Name": "Transportation"
                    }
                ],
                "Name": "Automobile"
            },
            {
                "Instances": [],
                "Confidence": 99.15271759033203,
                "Parents": [
                    {
                        "Name": "Transportation"
                    }
                ],
                "Name": "Vehicle"
            },
            {
                "Instances": [],
                "Confidence": 99.15271759033203,
                "Parents": [],
                "Name": "Transportation"
            },
            {
                "Instances": [
                    {
                        "BoundingBox": {
                            "Width": 0.10616336017847061,
                            "Top": 0.5039216876029968,
                            "Left": 0.0037978808395564556,
                            "Height": 0.18528179824352264
                        },
                        "Confidence": 99.15271759033203
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.2429988533258438,
                            "Top": 0.5251884460449219,
                            "Left": 0.7309805154800415,
                            "Height": 0.21577216684818268
                        },
                        "Confidence": 99.1286392211914
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.14233611524105072,
                            "Top": 0.5333095788955688,
                            "Left": 0.6494812965393066,
                            "Height": 0.15528248250484467
                        },
                        "Confidence": 98.48368072509766
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.11086395382881165,
                            "Top": 0.5354844927787781,
                            "Left": 0.10355594009160995,
                            "Height": 0.10271988064050674
                        },
                        "Confidence": 96.45606231689453
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.06254628300666809,
                            "Top": 0.5573825240135193,
                            "Left": 0.46083059906959534,
                            "Height": 0.053911514580249786
                        },
                        "Confidence": 93.65448760986328
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.10105438530445099,
                            "Top": 0.534368634223938,
                            "Left": 0.5743985772132874,
                            "Height": 0.12226245552301407
                        },
                        "Confidence": 93.06217193603516
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.056389667093753815,
                            "Top": 0.5235804319381714,
                            "Left": 0.9427769780158997,
                            "Height": 0.17163699865341187
                        },
                        "Confidence": 92.6864013671875
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.06003860384225845,
                            "Top": 0.5441341400146484,
                            "Left": 0.22409997880458832,
                            "Height": 0.06737709045410156
                        },
                        "Confidence": 90.4227066040039
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.02848697081208229,
                            "Top": 0.5107086896896362,
                            "Left": 0,
                            "Height": 0.19150497019290924
                        },
                        "Confidence": 86.65286254882812
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.04067881405353546,
                            "Top": 0.5566273927688599,
                            "Left": 0.316415935754776,
                            "Height": 0.03428703173995018
                        },
                        "Confidence": 85.36471557617188
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.043411049991846085,
                            "Top": 0.5394920110702515,
                            "Left": 0.18293385207653046,
                            "Height": 0.0893595889210701
                        },
                        "Confidence": 82.21705627441406
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.031183116137981415,
                            "Top": 0.5579366683959961,
                            "Left": 0.2853088080883026,
                            "Height": 0.03989990055561066
                        },
                        "Confidence": 81.0157470703125
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.031113790348172188,
                            "Top": 0.5504819750785828,
                            "Left": 0.2580395042896271,
                            "Height": 0.056484755128622055
                        },
                        "Confidence": 56.13441467285156
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.08586374670267105,
                            "Top": 0.5438792705535889,
                            "Left": 0.5128012895584106,
                            "Height": 0.08550430089235306
                        },
                        "Confidence": 52.37760925292969
                    }
                ],
                "Confidence": 99.15271759033203,
                "Parents": [
                    {
                        "Name": "Vehicle"
                    },
                    {
                        "Name": "Transportation"
                    }
                ],
                "Name": "Car"
            },
            {
                "Instances": [],
                "Confidence": 98.9914321899414,
                "Parents": [],
                "Name": "Human"
            },
            {
                "Instances": [
                    {
                        "BoundingBox": {
                            "Width": 0.19360728561878204,
                            "Top": 0.35072067379951477,
                            "Left": 0.43734854459762573,
                            "Height": 0.2742200493812561
                        },
                        "Confidence": 98.9914321899414
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.03801717236638069,
                            "Top": 0.5010883808135986,
                            "Left": 0.9155802130699158,
                            "Height": 0.06597328186035156
                        },
                        "Confidence": 85.02790832519531
                    }
                ],
                "Confidence": 98.9914321899414,
                "Parents": [],
                "Name": "Person"
            },
            {
                "Instances": [],
                "Confidence": 93.24951934814453,
                "Parents": [],
                "Name": "Machine"
            },
            {
                "Instances": [
                    {
                        "BoundingBox": {
                            "Width": 0.03561960905790329,
                            "Top": 0.6468243598937988,
                            "Left": 0.7850857377052307,
                            "Height": 0.08878646790981293
                        },
                        "Confidence": 93.24951934814453
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.02217046171426773,
                            "Top": 0.6149078607559204,
                            "Left": 0.04757237061858177,
                            "Height": 0.07136218994855881
                        },
                        "Confidence": 91.5025863647461
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.016197510063648224,
                            "Top": 0.6274210214614868,
                            "Left": 0.6472989320755005,
                            "Height": 0.04955997318029404
                        },
                        "Confidence": 85.14686584472656
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.020207518711686134,
                            "Top": 0.6348286867141724,
                            "Left": 0.7295016646385193,
                            "Height": 0.07059963047504425
                        },
                        "Confidence": 83.34547424316406
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.020280985161662102,
                            "Top": 0.6171894669532776,
                            "Left": 0.08744934946298599,
                            "Height": 0.05297485366463661
                        },
                        "Confidence": 79.9981460571289
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.018318990245461464,
                            "Top": 0.623889148235321,
                            "Left": 0.6836880445480347,
                            "Height": 0.06730121374130249
                        },
                        "Confidence": 78.87144470214844
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.021310249343514442,
                            "Top": 0.6167286038398743,
                            "Left": 0.004064912907779217,
                            "Height": 0.08317798376083374
                        },
                        "Confidence": 75.89361572265625
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.03604431077837944,
                            "Top": 0.7030032277107239,
                            "Left": 0.9254803657531738,
                            "Height": 0.04569442570209503
                        },
                        "Confidence": 64.402587890625
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.009834849275648594,
                            "Top": 0.5821820497512817,
                            "Left": 0.28094568848609924,
                            "Height": 0.01964157074689865
                        },
                        "Confidence": 62.79907989501953
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.01475677452981472,
                            "Top": 0.6137543320655823,
                            "Left": 0.5950819253921509,
                            "Height": 0.039063986390829086
                        },
                        "Confidence": 59.40483474731445
                    }
                ],
                "Confidence": 93.24951934814453,
                "Parents": [
                    {
                        "Name": "Machine"
                    }
                ],
                "Name": "Wheel"
            },
            {
                "Instances": [],
                "Confidence": 92.61514282226562,
                "Parents": [],
                "Name": "Road"
            },
            {
                "Instances": [],
                "Confidence": 92.37877655029297,
                "Parents": [
                    {
                        "Name": "Person"
                    }
                ],
                "Name": "Sport"
            },
            {
                "Instances": [],
                "Confidence": 92.37877655029297,
                "Parents": [
                    {
                        "Name": "Person"
                    }
                ],
                "Name": "Sports"
            },
            {
                "Instances": [
                    {
                        "BoundingBox": {
                            "Width": 0.12326609343290329,
                            "Top": 0.6332163214683533,
                            "Left": 0.44815489649772644,
                            "Height": 0.058117982000112534
                        },
                        "Confidence": 92.37877655029297
                    }
                ],
                "Confidence": 92.37877655029297,
                "Parents": [
                    {
                        "Name": "Person"
                    },
                    {
                        "Name": "Sport"
                    }
                ],
                "Name": "Skateboard"
            },
            {
                "Instances": [],
                "Confidence": 90.62931060791016,
                "Parents": [
                    {
                        "Name": "Person"
                    }
                ],
                "Name": "Pedestrian"
            },
            {
                "Instances": [],
                "Confidence": 88.81334686279297,
                "Parents": [],
                "Name": "Asphalt"
            },
            {
                "Instances": [],
                "Confidence": 88.81334686279297,
                "Parents": [],
                "Name": "Tarmac"
            },
            {
                "Instances": [],
                "Confidence": 88.23201751708984,
                "Parents": [],
                "Name": "Path"
            },
            {
                "Instances": [],
                "Confidence": 80.26520538330078,
                "Parents": [],
                "Name": "Urban"
            },
            {
                "Instances": [],
                "Confidence": 80.26520538330078,
                "Parents": [
                    {
                        "Name": "Building"
                    },
                    {
                        "Name": "Urban"
                    }
                ],
                "Name": "Town"
            },
            {
                "Instances": [],
                "Confidence": 80.26520538330078,
                "Parents": [],
                "Name": "Building"
            },
            {
                "Instances": [],
                "Confidence": 80.26520538330078,
                "Parents": [
                    {
                        "Name": "Building"
                    },
                    {
                        "Name": "Urban"
                    }
                ],
                "Name": "City"
            },
            {
                "Instances": [],
                "Confidence": 78.37934875488281,
                "Parents": [
                    {
                        "Name": "Car"
                    },
                    {
                        "Name": "Vehicle"
                    },
                    {
                        "Name": "Transportation"
                    }
                ],
                "Name": "Parking Lot"
            },
            {
                "Instances": [],
                "Confidence": 78.37934875488281,
                "Parents": [
                    {
                        "Name": "Car"
                    },
                    {
                        "Name": "Vehicle"
                    },
                    {
                        "Name": "Transportation"
                    }
                ],
                "Name": "Parking"
            },
            {
                "Instances": [],
                "Confidence": 74.37590026855469,
                "Parents": [
                    {
                        "Name": "Building"
                    },
                    {
                        "Name": "Urban"
                    },
                    {
                        "Name": "City"
                    }
                ],
                "Name": "Downtown"
            },
            {
                "Instances": [],
                "Confidence": 69.84622955322266,
                "Parents": [
                    {
                        "Name": "Road"
                    }
                ],
                "Name": "Intersection"
            },
            {
                "Instances": [],
                "Confidence": 57.68518829345703,
                "Parents": [
                    {
                        "Name": "Sports Car"
                    },
                    {
                        "Name": "Car"
                    },
                    {
                        "Name": "Vehicle"
                    },
                    {
                        "Name": "Transportation"
                    }
                ],
                "Name": "Coupe"
            },
            {
                "Instances": [],
                "Confidence": 57.68518829345703,
                "Parents": [
                    {
                        "Name": "Car"
                    },
                    {
                        "Name": "Vehicle"
                    },
                    {
                        "Name": "Transportation"
                    }
                ],
                "Name": "Sports Car"
            },
            {
                "Instances": [],
                "Confidence": 56.59492111206055,
                "Parents": [
                    {
                        "Name": "Path"
                    }
                ],
                "Name": "Sidewalk"
            },
            {
                "Instances": [],
                "Confidence": 56.59492111206055,
                "Parents": [
                    {
                        "Name": "Path"
                    }
                ],
                "Name": "Pavement"
            },
            {
                "Instances": [],
                "Confidence": 55.58770751953125,
                "Parents": [
                    {
                        "Name": "Building"
                    },
                    {
                        "Name": "Urban"
                    }
                ],
                "Name": "Neighborhood"
            }
        ],
        "LabelModelVersion": "2.0"
    }

For more information, see `Detecting Labels in an Image <https://docs.aws.amazon.com/rekognition/latest/dg/labels-detect-labels-image.html>`__ in the *Amazon Rekognition Developer Guide*.
