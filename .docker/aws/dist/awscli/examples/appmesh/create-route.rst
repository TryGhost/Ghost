**To create a new gRPC route**

The following ``create-route`` example uses a JSON input file to create a gRPC route. GRPC traffic that has metadata that starts with 123 is routed to a virtual node named serviceBgrpc. If there are specific gRPC, HTTP, or TCP failures when attempting to communicate with the target of the route, the route is retried three times. There is a 15 second delay between each retry attempt. ::

    aws appmesh create-route \
        --cli-input-json file://create-route-grpc.json

Contents of ``create-route-grpc.json``::

    {
        "meshName" : "apps",
        "routeName" : "grpcRoute",
        "spec" : {
           "grpcRoute" : {
              "action" : {
                 "weightedTargets" : [
                    {
                       "virtualNode" : "serviceBgrpc",
                       "weight" : 100
                    }
                 ]
              },
              "match" : {
                 "metadata" : [
                    {
                       "invert" : false,
                       "match" : {
                          "prefix" : "123"
                       },
                       "name" : "myMetadata"
                    }
                 ],
                 "methodName" : "GetColor",
                 "serviceName" : "com.amazonaws.services.ColorService"
              },
              "retryPolicy" : {
                 "grpcRetryEvents" : [ "deadline-exceeded" ],
                 "httpRetryEvents" : [ "server-error", "gateway-error" ],
                 "maxRetries" : 3,
                 "perRetryTimeout" : {
                    "unit" : "s",
                    "value" : 15
                 },
                 "tcpRetryEvents" : [ "connection-error" ]
              }
           },
           "priority" : 100
        },
        "virtualRouterName" : "serviceBgrpc"
    }

Output::

    {
        "route": {
            "meshName": "apps",
            "metadata": {
                "arn": "arn:aws:appmesh:us-west-2:123456789012:mesh/apps/virtualRouter/serviceBgrpc/route/grpcRoute",
                "createdAt": 1572010806.008,
                "lastUpdatedAt": 1572010806.008,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 1
            },
            "routeName": "grpcRoute",
            "spec": {
                "grpcRoute": {
                    "action": {
                        "weightedTargets": [
                            {
                                "virtualNode": "serviceBgrpc",
                                "weight": 100
                            }
                        ]
                    },
                    "match": {
                        "metadata": [
                            {
                                "invert": false,
                                "match": {
                                    "prefix": "123"
                                },
                                "name": "mymetadata"
                            }
                        ],
                        "methodName": "GetColor",
                        "serviceName": "com.amazonaws.services.ColorService"
                    },
                    "retryPolicy": {
                        "grpcRetryEvents": [
                            "deadline-exceeded"
                        ],
                        "httpRetryEvents": [
                            "server-error",
                            "gateway-error"
                        ],
                        "maxRetries": 3,
                        "perRetryTimeout": {
                            "unit": "s",
                            "value": 15
                        },
                        "tcpRetryEvents": [
                            "connection-error"
                        ]
                    }
                },
                "priority": 100
            },
            "status": {
                "status": "ACTIVE"
            },
            "virtualRouterName": "serviceBgrpc"
        }
    }

**To create a new HTTP or HTTP/2 route**

The following ``create-route`` example uses a JSON input file to create an HTTP/2 route. To create an HTTP route, replace http2Route with httpRoute under spec. All HTTP/2 traffic addressed to any URL prefix that has a header value that starts with 123 is routed to a virtual node named serviceBhttp2. If there are specific HTTP or TCP failures when attempting to communicate with the target of the route, the route is retried three times. There is a 15 second delay between each retry attempt. ::

    aws appmesh create-route \
        --cli-input-json file://create-route-http2.json

Contents of ``create-route-http2.json``::

    {
        "meshName": "apps",
        "routeName": "http2Route",
        "spec": {
            "http2Route": {
                "action": {
                    "weightedTargets": [
                        {
                            "virtualNode": "serviceBhttp2",
                            "weight": 100
                        }
                    ]
                },
                "match": {
                    "headers": [
                        {
                            "invert": false,
                            "match": {
                                "prefix": "123"
                            },
                            "name": "clientRequestId"
                        }
                    ],
                    "method": "POST",
                    "prefix": "/",
                    "scheme": "http"
                },
                "retryPolicy": {
                    "httpRetryEvents": [
                        "server-error",
                        "gateway-error"
                    ],
                    "maxRetries": 3,
                    "perRetryTimeout": {
                        "unit": "s",
                        "value": 15
                    },
                    "tcpRetryEvents": [
                        "connection-error"
                    ]
                }
            },
            "priority": 200
        },
        "virtualRouterName": "serviceBhttp2"
    }

Output::

    {
        "route": {
            "meshName": "apps",
            "metadata": {
                "arn": "arn:aws:appmesh:us-west-2:123456789012:mesh/apps/virtualRouter/serviceBhttp2/route/http2Route",
                "createdAt": 1572011008.352,
                "lastUpdatedAt": 1572011008.352,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 1
            },
            "routeName": "http2Route",
            "spec": {
                "http2Route": {
                    "action": {
                        "weightedTargets": [
                            {
                                "virtualNode": "serviceBhttp2",
                                "weight": 100
                            }
                        ]
                    },
                    "match": {
                        "headers": [
                            {
                                "invert": false,
                                "match": {
                                    "prefix": "123"
                                },
                                "name": "clientRequestId"
                            }
                        ],
                        "method": "POST",
                        "prefix": "/",
                        "scheme": "http"
                    },
                    "retryPolicy": {
                        "httpRetryEvents": [
                            "server-error",
                            "gateway-error"
                        ],
                        "maxRetries": 3,
                        "perRetryTimeout": {
                            "unit": "s",
                            "value": 15
                        },
                        "tcpRetryEvents": [
                            "connection-error"
                        ]
                    }
                },
                "priority": 200
            },
            "status": {
                "status": "ACTIVE"
            },
            "virtualRouterName": "serviceBhttp2"
        }
    }

**To create a new TCP route**

The following ``create-route`` example uses a JSON input file to create a TCP route. 75 percent of traffic is routed to a virtual node named serviceBtcp, and 25 percent of traffic is routed to a virtual node named serviceBv2tcp. Specifying different weightings for different targets is an effective way to do a deployment of a new version of an application. You can adjust the weights so that eventually, 100 percent of all traffic is routed to a target that has the new version of an application. ::

    aws appmesh create-route \
        --cli-input-json file://create-route-tcp.json

Contents of create-route-tcp.json::

    {
        "meshName": "apps",
        "routeName": "tcpRoute",
        "spec": {
            "priority": 300,
            "tcpRoute": {
                "action": {
                    "weightedTargets": [
                        {
                            "virtualNode": "serviceBtcp",
                            "weight": 75
                        },
                        {
                            "virtualNode": "serviceBv2tcp",
                            "weight": 25
                        }
                    ]
                }
            }
        },
        "virtualRouterName": "serviceBtcp"
    }

Output::

    {
        "route": {
            "meshName": "apps",
            "metadata": {
                "arn": "arn:aws:appmesh:us-west-2:123456789012:mesh/apps/virtualRouter/serviceBtcp/route/tcpRoute",
                "createdAt": 1572011436.26,
                "lastUpdatedAt": 1572011436.26,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 1
            },
            "routeName": "tcpRoute",
            "spec": {
                "priority": 300,
                "tcpRoute": {
                    "action": {
                        "weightedTargets": [
                            {
                                "virtualNode": "serviceBtcp",
                                "weight": 75
                            },
                            {
                                "virtualNode": "serviceBv2tcp",
                                "weight": 25
                            }
                        ]
                    }
                }
            },
            "status": {
                "status": "ACTIVE"
            },
            "virtualRouterName": "serviceBtcp"
        }
    }

For more information, see `Routes <https://docs.aws.amazon.com/app-mesh/latest/userguide/routes.html>`__ in the *AWS App Mesh User Guide*.
