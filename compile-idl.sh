#!/bin/bash

XULRUNNER_SDK_PATH=/home/fidel/dev/xulrunner-sdk
CACHE_PATH=/tmp
OUTPUT_PATH=/home/fidel/dev/foxyproxy/basic_and_standard/trunk/src/components/api
INPUT_PATH=/home/fidel/dev/foxyproxy/basic_and_standard/trunk/src/components/api

$XULRUNNER_SDK_PATH/sdk/bin/typelib.py -I $XULRUNNER_SDK_PATH/idl/ --cachedir $CACHE_PATH -o $OUTPUT_PATH/api.xpt $INPUT_PATH/api.idl
