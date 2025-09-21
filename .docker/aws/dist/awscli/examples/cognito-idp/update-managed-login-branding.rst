**To update a managed login branding style**

The following ``update-managed-login-branding`` example updates the requested app client branding style. ::

    aws cognito-idp update-managed-login-branding \
        --cli-input-json file://update-managed-login-branding.json

Contents of ``update-managed-login-branding.json``::

    {
        "Assets": [
            {
                "Bytes": "PHN2ZyB3aWR0aD0iMjAwMDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgMjAwMDAgNDAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZyBjbGlwLXBhdGg9InVybCgjY2xpcDBfMTcyNTlfMjM2Njc0KSI+CjxyZWN0IHdpZHRoPSIyMDAwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl8xNzI1OV8yMzY2NzQpIi8+CjxwYXRoIGQ9Ik0wIDBIMjAwMDBWNDAwSDBWMFoiIGZpbGw9IiMxMjIwMzciIGZpbGwtb3BhY2l0eT0iMC41Ii8+CjwvZz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xNzI1OV8yMzY2NzQiIHgxPSItODk0LjI0OSIgeTE9IjE5OS45MzEiIHgyPSIxODAzNC41IiB5Mj0iLTU4OTkuNTciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0JGODBGRiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRjhGQUIiLz4KPC9saW5lYXJHcmFkaWVudD4KPGNsaXBQYXRoIGlkPSJjbGlwMF8xNzI1OV8yMzY2NzQiPgo8cmVjdCB3aWR0aD0iMjAwMDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ3aGl0ZSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=",
                "Category": "PAGE_FOOTER_BACKGROUND",
                "ColorMode": "DARK",
                "Extension": "SVG"
            }
        ],
        "ManagedLoginBrandingId": "63f30090-6b1f-4278-b885-2bbb81f8e545",
        "Settings": {
            "categories": {
                "auth": {
                    "authMethodOrder": [
                        [
                            {
                                "display": "BUTTON",
                                "type": "FEDERATED"
                            },
                            {
                                "display": "INPUT",
                                "type": "USERNAME_PASSWORD"
                            }
                        ]
                    ],
                    "federation": {
                        "interfaceStyle": "BUTTON_LIST",
                        "order": [
                        ]
                    }
                },
                "form": {
                    "displayGraphics": true,
                    "instructions": {
                        "enabled": false
                    },
                    "languageSelector": {
                        "enabled": false
                    },
                    "location": {
                        "horizontal": "CENTER",
                        "vertical": "CENTER"
                    },
                    "sessionTimerDisplay": "NONE"
                },
                "global": {
                    "colorSchemeMode": "LIGHT",
                    "pageFooter": {
                        "enabled": false
                    },
                    "pageHeader": {
                        "enabled": false
                    },
                    "spacingDensity": "REGULAR"
                },
                "signUp": {
                    "acceptanceElements": [
                        {
                            "enforcement": "NONE",
                            "textKey": "en"
                        }
                    ]
                }
            },
            "componentClasses": {
                "buttons": {
                    "borderRadius": 8.0
                },
                "divider": {
                    "darkMode": {
                        "borderColor": "232b37ff"
                    },
                    "lightMode": {
                        "borderColor": "ebebf0ff"
                    }
                },
                "dropDown": {
                    "borderRadius": 8.0,
                    "darkMode": {
                        "defaults": {
                            "itemBackgroundColor": "192534ff"
                        },
                        "hover": {
                            "itemBackgroundColor": "081120ff",
                            "itemBorderColor": "5f6b7aff",
                            "itemTextColor": "e9ebedff"
                        },
                        "match": {
                            "itemBackgroundColor": "d1d5dbff",
                            "itemTextColor": "89bdeeff"
                        }
                    },
                    "lightMode": {
                        "defaults": {
                            "itemBackgroundColor": "ffffffff"
                        },
                        "hover": {
                            "itemBackgroundColor": "f4f4f4ff",
                            "itemBorderColor": "7d8998ff",
                            "itemTextColor": "000716ff"
                        },
                        "match": {
                            "itemBackgroundColor": "414d5cff",
                            "itemTextColor": "0972d3ff"
                        }
                    }
                },
                "focusState": {
                    "darkMode": {
                        "borderColor": "539fe5ff"
                    },
                    "lightMode": {
                        "borderColor": "0972d3ff"
                    }
                },
                "idpButtons": {
                    "icons": {
                        "enabled": true
                    }
                },
                "input": {
                    "borderRadius": 8.0,
                    "darkMode": {
                        "defaults": {
                            "backgroundColor": "0f1b2aff",
                            "borderColor": "5f6b7aff"
                        },
                        "placeholderColor": "8d99a8ff"
                    },
                    "lightMode": {
                        "defaults": {
                            "backgroundColor": "ffffffff",
                            "borderColor": "7d8998ff"
                        },
                        "placeholderColor": "5f6b7aff"
                    }
                },
                "inputDescription": {
                    "darkMode": {
                        "textColor": "8d99a8ff"
                    },
                    "lightMode": {
                        "textColor": "5f6b7aff"
                    }
                },
                "inputLabel": {
                    "darkMode": {
                        "textColor": "d1d5dbff"
                    },
                    "lightMode": {
                        "textColor": "000716ff"
                    }
                },
                "link": {
                    "darkMode": {
                        "defaults": {
                            "textColor": "539fe5ff"
                        },
                        "hover": {
                            "textColor": "89bdeeff"
                        }
                    },
                    "lightMode": {
                        "defaults": {
                            "textColor": "0972d3ff"
                        },
                        "hover": {
                            "textColor": "033160ff"
                        }
                    }
                },
                "optionControls": {
                    "darkMode": {
                        "defaults": {
                            "backgroundColor": "0f1b2aff",
                            "borderColor": "7d8998ff"
                        },
                        "selected": {
                            "backgroundColor": "539fe5ff",
                            "foregroundColor": "000716ff"
                        }
                    },
                    "lightMode": {
                        "defaults": {
                            "backgroundColor": "ffffffff",
                            "borderColor": "7d8998ff"
                        },
                        "selected": {
                            "backgroundColor": "0972d3ff",
                            "foregroundColor": "ffffffff"
                        }
                    }
                },
                "statusIndicator": {
                    "darkMode": {
                        "error": {
                            "backgroundColor": "1a0000ff",
                            "borderColor": "eb6f6fff",
                            "indicatorColor": "eb6f6fff"
                        },
                        "pending": {
                            "indicatorColor": "AAAAAAAA"
                        },
                        "success": {
                            "backgroundColor": "001a02ff",
                            "borderColor": "29ad32ff",
                            "indicatorColor": "29ad32ff"
                        },
                        "warning": {
                            "backgroundColor": "1d1906ff",
                            "borderColor": "e0ca57ff",
                            "indicatorColor": "e0ca57ff"
                        }
                    },
                    "lightMode": {
                        "error": {
                            "backgroundColor": "fff7f7ff",
                            "borderColor": "d91515ff",
                            "indicatorColor": "d91515ff"
                        },
                        "pending": {
                            "indicatorColor": "AAAAAAAA"
                        },
                        "success": {
                            "backgroundColor": "f2fcf3ff",
                            "borderColor": "037f0cff",
                            "indicatorColor": "037f0cff"
                        },
                        "warning": {
                            "backgroundColor": "fffce9ff",
                            "borderColor": "8d6605ff",
                            "indicatorColor": "8d6605ff"
                        }
                    }
                }
            },
            "components": {
                "alert": {
                    "borderRadius": 12.0,
                    "darkMode": {
                        "error": {
                            "backgroundColor": "1a0000ff",
                            "borderColor": "eb6f6fff"
                        }
                    },
                    "lightMode": {
                        "error": {
                            "backgroundColor": "fff7f7ff",
                            "borderColor": "d91515ff"
                        }
                    }
                },
                "favicon": {
                    "enabledTypes": [
                        "ICO",
                        "SVG"
                    ]
                },
                "form": {
                    "backgroundImage": {
                        "enabled": false
                    },
                    "borderRadius": 8.0,
                    "darkMode": {
                        "backgroundColor": "0f1b2aff",
                        "borderColor": "424650ff"
                    },
                    "lightMode": {
                        "backgroundColor": "ffffffff",
                        "borderColor": "c6c6cdff"
                    },
                    "logo": {
                        "enabled": false,
                        "formInclusion": "IN",
                        "location": "CENTER",
                        "position": "TOP"
                    }
                },
                "idpButton": {
                    "custom": {
                    },
                    "standard": {
                        "darkMode": {
                            "active": {
                                "backgroundColor": "354150ff",
                                "borderColor": "89bdeeff",
                                "textColor": "89bdeeff"
                            },
                            "defaults": {
                                "backgroundColor": "0f1b2aff",
                                "borderColor": "c6c6cdff",
                                "textColor": "c6c6cdff"
                            },
                            "hover": {
                                "backgroundColor": "192534ff",
                                "borderColor": "89bdeeff",
                                "textColor": "89bdeeff"
                            }
                        },
                        "lightMode": {
                            "active": {
                                "backgroundColor": "d3e7f9ff",
                                "borderColor": "033160ff",
                                "textColor": "033160ff"
                            },
                            "defaults": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "424650ff",
                                "textColor": "424650ff"
                            },
                            "hover": {
                                "backgroundColor": "f2f8fdff",
                                "borderColor": "033160ff",
                                "textColor": "033160ff"
                            }
                        }
                    }
                },
                "pageBackground": {
                    "darkMode": {
                        "color": "0f1b2aff"
                    },
                    "image": {
                        "enabled": true
                    },
                    "lightMode": {
                        "color": "ffffffff"
                    }
                },
                "pageFooter": {
                    "backgroundImage": {
                        "enabled": false
                    },
                    "darkMode": {
                        "background": {
                            "color": "0f141aff"
                        },
                        "borderColor": "424650ff"
                    },
                    "lightMode": {
                        "background": {
                            "color": "fafafaff"
                        },
                        "borderColor": "d5dbdbff"
                    },
                    "logo": {
                        "enabled": false,
                        "location": "START"
                    }
                },
                "pageHeader": {
                    "backgroundImage": {
                        "enabled": false
                    },
                    "darkMode": {
                        "background": {
                            "color": "0f141aff"
                        },
                        "borderColor": "424650ff"
                    },
                    "lightMode": {
                        "background": {
                            "color": "fafafaff"
                        },
                        "borderColor": "d5dbdbff"
                    },
                    "logo": {
                        "enabled": false,
                        "location": "START"
                    }
                },
                "pageText": {
                    "darkMode": {
                        "bodyColor": "b6bec9ff",
                        "descriptionColor": "b6bec9ff",
                        "headingColor": "d1d5dbff"
                    },
                    "lightMode": {
                        "bodyColor": "414d5cff",
                        "descriptionColor": "414d5cff",
                        "headingColor": "000716ff"
                    }
                },
                "phoneNumberSelector": {
                    "displayType": "TEXT"
                },
                "primaryButton": {
                    "darkMode": {
                        "active": {
                            "backgroundColor": "539fe5ff",
                            "textColor": "000716ff"
                        },
                        "defaults": {
                            "backgroundColor": "539fe5ff",
                            "textColor": "000716ff"
                        },
                        "disabled": {
                            "backgroundColor": "ffffffff",
                            "borderColor": "ffffffff"
                        },
                        "hover": {
                            "backgroundColor": "89bdeeff",
                            "textColor": "000716ff"
                        }
                    },
                    "lightMode": {
                        "active": {
                            "backgroundColor": "033160ff",
                            "textColor": "ffffffff"
                        },
                        "defaults": {
                            "backgroundColor": "0972d3ff",
                            "textColor": "ffffffff"
                        },
                        "disabled": {
                            "backgroundColor": "ffffffff",
                            "borderColor": "ffffffff"
                        },
                        "hover": {
                            "backgroundColor": "033160ff",
                            "textColor": "ffffffff"
                        }
                    }
                },
                "secondaryButton": {
                    "darkMode": {
                        "active": {
                            "backgroundColor": "354150ff",
                            "borderColor": "89bdeeff",
                            "textColor": "89bdeeff"
                        },
                        "defaults": {
                            "backgroundColor": "0f1b2aff",
                            "borderColor": "539fe5ff",
                            "textColor": "539fe5ff"
                        },
                        "hover": {
                            "backgroundColor": "192534ff",
                            "borderColor": "89bdeeff",
                            "textColor": "89bdeeff"
                        }
                    },
                    "lightMode": {
                        "active": {
                            "backgroundColor": "d3e7f9ff",
                            "borderColor": "033160ff",
                            "textColor": "033160ff"
                        },
                        "defaults": {
                            "backgroundColor": "ffffffff",
                            "borderColor": "0972d3ff",
                            "textColor": "0972d3ff"
                        },
                        "hover": {
                            "backgroundColor": "f2f8fdff",
                            "borderColor": "033160ff",
                            "textColor": "033160ff"
                        }
                    }
                }
            }
        },
        "UseCognitoProvidedValues": false,
        "UserPoolId": "ca-central-1_EXAMPLE"
    }

Output::

    {
        "ManagedLoginBranding": {
            "Assets": [
                {
                    "Bytes": "PHN2ZyB3aWR0aD0iMjAwMDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgMjAwMDAgNDAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZyBjbGlwLXBhdGg9InVybCgjY2xpcDBfMTcyNTlfMjM2Njc0KSI+CjxyZWN0IHdpZHRoPSIyMDAwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl8xNzI1OV8yMzY2NzQpIi8+CjxwYXRoIGQ9Ik0wIDBIMjAwMDBWNDAwSDBWMFoiIGZpbGw9IiMxMjIwMzciIGZpbGwtb3BhY2l0eT0iMC41Ii8+CjwvZz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xNzI1OV8yMzY2NzQiIHgxPSItODk0LjI0OSIgeTE9IjE5OS45MzEiIHgyPSIxODAzNC41IiB5Mj0iLTU4OTkuNTciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0JGODBGRiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRjhGQUIiLz4KPC9saW5lYXJHcmFkaWVudD4KPGNsaXBQYXRoIGlkPSJjbGlwMF8xNzI1OV8yMzY2NzQiPgo8cmVjdCB3aWR0aD0iMjAwMDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ3aGl0ZSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=",
                    "Category": "PAGE_FOOTER_BACKGROUND",
                    "ColorMode": "DARK",
                    "Extension": "SVG"
                }
            ],
            "CreationDate": 1732138490.642,
            "LastModifiedDate": 1732140420.301,
            "ManagedLoginBrandingId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Settings": {
                "categories": {
                    "auth": {
                        "authMethodOrder": [
                            [
                                {
                                    "display": "BUTTON",
                                    "type": "FEDERATED"
                                },
                                {
                                    "display": "INPUT",
                                    "type": "USERNAME_PASSWORD"
                                }
                            ]
                        ],
                        "federation": {
                            "interfaceStyle": "BUTTON_LIST",
                            "order": [
                            ]
                        }
                    },
                    "form": {
                        "displayGraphics": true,
                        "instructions": {
                            "enabled": false
                        },
                        "languageSelector": {
                            "enabled": false
                        },
                        "location": {
                            "horizontal": "CENTER",
                            "vertical": "CENTER"
                        },
                        "sessionTimerDisplay": "NONE"
                    },
                    "global": {
                        "colorSchemeMode": "LIGHT",
                        "pageFooter": {
                            "enabled": false
                        },
                        "pageHeader": {
                            "enabled": false
                        },
                        "spacingDensity": "REGULAR"
                    },
                    "signUp": {
                        "acceptanceElements": [
                            {
                                "enforcement": "NONE",
                                "textKey": "en"
                            }
                        ]
                    }
                },
                "componentClasses": {
                    "buttons": {
                        "borderRadius": 8.0
                    },
                    "divider": {
                        "darkMode": {
                            "borderColor": "232b37ff"
                        },
                        "lightMode": {
                            "borderColor": "ebebf0ff"
                        }
                    },
                    "dropDown": {
                        "borderRadius": 8.0,
                        "darkMode": {
                            "defaults": {
                                "itemBackgroundColor": "192534ff"
                            },
                            "hover": {
                                "itemBackgroundColor": "081120ff",
                                "itemBorderColor": "5f6b7aff",
                                "itemTextColor": "e9ebedff"
                            },
                            "match": {
                                "itemBackgroundColor": "d1d5dbff",
                                "itemTextColor": "89bdeeff"
                            }
                        },
                        "lightMode": {
                            "defaults": {
                                "itemBackgroundColor": "ffffffff"
                            },
                            "hover": {
                                "itemBackgroundColor": "f4f4f4ff",
                                "itemBorderColor": "7d8998ff",
                                "itemTextColor": "000716ff"
                            },
                            "match": {
                                "itemBackgroundColor": "414d5cff",
                                "itemTextColor": "0972d3ff"
                            }
                        }
                    },
                    "focusState": {
                        "darkMode": {
                            "borderColor": "539fe5ff"
                        },
                        "lightMode": {
                            "borderColor": "0972d3ff"
                        }
                    },
                    "idpButtons": {
                        "icons": {
                            "enabled": true
                        }
                    },
                    "input": {
                        "borderRadius": 8.0,
                        "darkMode": {
                            "defaults": {
                                "backgroundColor": "0f1b2aff",
                                "borderColor": "5f6b7aff"
                            },
                            "placeholderColor": "8d99a8ff"
                        },
                        "lightMode": {
                            "defaults": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "7d8998ff"
                            },
                            "placeholderColor": "5f6b7aff"
                        }
                    },
                    "inputDescription": {
                        "darkMode": {
                            "textColor": "8d99a8ff"
                        },
                        "lightMode": {
                            "textColor": "5f6b7aff"
                        }
                    },
                    "inputLabel": {
                        "darkMode": {
                            "textColor": "d1d5dbff"
                        },
                        "lightMode": {
                            "textColor": "000716ff"
                        }
                    },
                    "link": {
                        "darkMode": {
                            "defaults": {
                                "textColor": "539fe5ff"
                            },
                            "hover": {
                                "textColor": "89bdeeff"
                            }
                        },
                        "lightMode": {
                            "defaults": {
                                "textColor": "0972d3ff"
                            },
                            "hover": {
                                "textColor": "033160ff"
                            }
                        }
                    },
                    "optionControls": {
                        "darkMode": {
                            "defaults": {
                                "backgroundColor": "0f1b2aff",
                                "borderColor": "7d8998ff"
                            },
                            "selected": {
                                "backgroundColor": "539fe5ff",
                                "foregroundColor": "000716ff"
                            }
                        },
                        "lightMode": {
                            "defaults": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "7d8998ff"
                            },
                            "selected": {
                                "backgroundColor": "0972d3ff",
                                "foregroundColor": "ffffffff"
                            }
                        }
                    },
                    "statusIndicator": {
                        "darkMode": {
                            "error": {
                                "backgroundColor": "1a0000ff",
                                "borderColor": "eb6f6fff",
                                "indicatorColor": "eb6f6fff"
                            },
                            "pending": {
                                "indicatorColor": "AAAAAAAA"
                            },
                            "success": {
                                "backgroundColor": "001a02ff",
                                "borderColor": "29ad32ff",
                                "indicatorColor": "29ad32ff"
                            },
                            "warning": {
                                "backgroundColor": "1d1906ff",
                                "borderColor": "e0ca57ff",
                                "indicatorColor": "e0ca57ff"
                            }
                        },
                        "lightMode": {
                            "error": {
                                "backgroundColor": "fff7f7ff",
                                "borderColor": "d91515ff",
                                "indicatorColor": "d91515ff"
                            },
                            "pending": {
                                "indicatorColor": "AAAAAAAA"
                            },
                            "success": {
                                "backgroundColor": "f2fcf3ff",
                                "borderColor": "037f0cff",
                                "indicatorColor": "037f0cff"
                            },
                            "warning": {
                                "backgroundColor": "fffce9ff",
                                "borderColor": "8d6605ff",
                                "indicatorColor": "8d6605ff"
                            }
                        }
                    }
                },
                "components": {
                    "alert": {
                        "borderRadius": 12.0,
                        "darkMode": {
                            "error": {
                                "backgroundColor": "1a0000ff",
                                "borderColor": "eb6f6fff"
                            }
                        },
                        "lightMode": {
                            "error": {
                                "backgroundColor": "fff7f7ff",
                                "borderColor": "d91515ff"
                            }
                        }
                    },
                    "favicon": {
                        "enabledTypes": [
                            "ICO",
                            "SVG"
                        ]
                    },
                    "form": {
                        "backgroundImage": {
                            "enabled": false
                        },
                        "borderRadius": 8.0,
                        "darkMode": {
                            "backgroundColor": "0f1b2aff",
                            "borderColor": "424650ff"
                        },
                        "lightMode": {
                            "backgroundColor": "ffffffff",
                            "borderColor": "c6c6cdff"
                        },
                        "logo": {
                            "enabled": false,
                            "formInclusion": "IN",
                            "location": "CENTER",
                            "position": "TOP"
                        }
                    },
                    "idpButton": {
                        "custom": {
                        },
                        "standard": {
                            "darkMode": {
                                "active": {
                                    "backgroundColor": "354150ff",
                                    "borderColor": "89bdeeff",
                                    "textColor": "89bdeeff"
                                },
                                "defaults": {
                                    "backgroundColor": "0f1b2aff",
                                    "borderColor": "c6c6cdff",
                                    "textColor": "c6c6cdff"
                                },
                                "hover": {
                                    "backgroundColor": "192534ff",
                                    "borderColor": "89bdeeff",
                                    "textColor": "89bdeeff"
                                }
                            },
                            "lightMode": {
                                "active": {
                                    "backgroundColor": "d3e7f9ff",
                                    "borderColor": "033160ff",
                                    "textColor": "033160ff"
                                },
                                "defaults": {
                                    "backgroundColor": "ffffffff",
                                    "borderColor": "424650ff",
                                    "textColor": "424650ff"
                                },
                                "hover": {
                                    "backgroundColor": "f2f8fdff",
                                    "borderColor": "033160ff",
                                    "textColor": "033160ff"
                                }
                            }
                        }
                    },
                    "pageBackground": {
                        "darkMode": {
                            "color": "0f1b2aff"
                        },
                        "image": {
                            "enabled": true
                        },
                        "lightMode": {
                            "color": "ffffffff"
                        }
                    },
                    "pageFooter": {
                        "backgroundImage": {
                            "enabled": false
                        },
                        "darkMode": {
                            "background": {
                                "color": "0f141aff"
                            },
                            "borderColor": "424650ff"
                        },
                        "lightMode": {
                            "background": {
                                "color": "fafafaff"
                            },
                            "borderColor": "d5dbdbff"
                        },
                        "logo": {
                            "enabled": false,
                            "location": "START"
                        }
                    },
                    "pageHeader": {
                        "backgroundImage": {
                            "enabled": false
                        },
                        "darkMode": {
                            "background": {
                                "color": "0f141aff"
                            },
                            "borderColor": "424650ff"
                        },
                        "lightMode": {
                            "background": {
                                "color": "fafafaff"
                            },
                            "borderColor": "d5dbdbff"
                        },
                        "logo": {
                            "enabled": false,
                            "location": "START"
                        }
                    },
                    "pageText": {
                        "darkMode": {
                            "bodyColor": "b6bec9ff",
                            "descriptionColor": "b6bec9ff",
                            "headingColor": "d1d5dbff"
                        },
                        "lightMode": {
                            "bodyColor": "414d5cff",
                            "descriptionColor": "414d5cff",
                            "headingColor": "000716ff"
                        }
                    },
                    "phoneNumberSelector": {
                        "displayType": "TEXT"
                    },
                    "primaryButton": {
                        "darkMode": {
                            "active": {
                                "backgroundColor": "539fe5ff",
                                "textColor": "000716ff"
                            },
                            "defaults": {
                                "backgroundColor": "539fe5ff",
                                "textColor": "000716ff"
                            },
                            "disabled": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "ffffffff"
                            },
                            "hover": {
                                "backgroundColor": "89bdeeff",
                                "textColor": "000716ff"
                            }
                        },
                        "lightMode": {
                            "active": {
                                "backgroundColor": "033160ff",
                                "textColor": "ffffffff"
                            },
                            "defaults": {
                                "backgroundColor": "0972d3ff",
                                "textColor": "ffffffff"
                            },
                            "disabled": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "ffffffff"
                            },
                            "hover": {
                                "backgroundColor": "033160ff",
                                "textColor": "ffffffff"
                            }
                        }
                    },
                    "secondaryButton": {
                        "darkMode": {
                            "active": {
                                "backgroundColor": "354150ff",
                                "borderColor": "89bdeeff",
                                "textColor": "89bdeeff"
                            },
                            "defaults": {
                                "backgroundColor": "0f1b2aff",
                                "borderColor": "539fe5ff",
                                "textColor": "539fe5ff"
                            },
                            "hover": {
                                "backgroundColor": "192534ff",
                                "borderColor": "89bdeeff",
                                "textColor": "89bdeeff"
                            }
                        },
                        "lightMode": {
                            "active": {
                                "backgroundColor": "d3e7f9ff",
                                "borderColor": "033160ff",
                                "textColor": "033160ff"
                            },
                            "defaults": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "0972d3ff",
                                "textColor": "0972d3ff"
                            },
                            "hover": {
                                "backgroundColor": "f2f8fdff",
                                "borderColor": "033160ff",
                                "textColor": "033160ff"
                            }
                        }
                    }
                }
            },
            "UseCognitoProvidedValues": false,
            "UserPoolId": "ca-central-1_EXAMPLE"
        }
    }

For more information, see `Apply branding to managed login pages <https://docs.aws.amazon.com/cognito/latest/developerguide/managed-login-branding.html>`__ in the *Amazon Cognito Developer Guide*.
 