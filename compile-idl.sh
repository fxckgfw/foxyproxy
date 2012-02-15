#!/bin/bash

XULRUNNER_SDK_PATH=/home/fidel/dev/xulrunner-sdk
CACHE_PATH=/tmp
OUTPUT_PATH=/home/fidel/dev/foxyproxy/basic_and_standard/trunk/src/components
INPUT_PATH=/home/fidel/dev/foxyproxy/basic_and_standard/trunk/src/components

$XULRUNNER_SDK_PATH/sdk/bin/typelib.py -I $XULRUNNER_SDK_PATH/idl/ --cachedir $CACH_PATH -o $OUTPUT_PATH/api.xpt $INPUT_PATH/api.idl
