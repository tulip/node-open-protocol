//@ts-check
/*
   Copyright 2018 Smart-Tech Controle e Automação

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
"use strict";
/*jshint esversion: 6, node: true*/

/*
    MID 0900
    [xxxxxxxxxx]    [xxx...xxx]     [xxx]       [[][][][][]]    [xx]        [xx]            [xxx]
    (10) 0-9        (19) 10-28      (3) 29-31   (n) 32-n        (2) n       (2) n           (3) n
    resultID        timeStamp       numberPID   dataFields      traceType   transducerType  unit

    [xxx]               [[][][][][]]        [xxxxx]         [0x00]          [xx]       
    (3) n               (n) n               (5) n           (1) n           (2) n      
    numberResolution    resolutionFields    numberTrace     NUL character   traceSample

    Data fields
    [xxxxx]         [xxx]       [xx]        [xxx]       [xxxx]          [xxx...xxx]
    (5) 0-4         (3) 5-7     (2) 8-9     (3) 10-12   (4) 13-16       (n) 17-n 
    parameterID     lenght      dataType    unit        stepNumber      dataValue

    Resolution fields
    [xxxxx]         [xxxxx]         [xxx]       [xx]            [xxx]        [xxx...xxx]
    (5) 0-4         (5) 5-9         (3) 10-12   (2) 13-14       (3) 15-17    (n) 18-n  
    firstIndex      lastIndex       length      dataType        unit         timeValue
*/
/*
    payload: {
        resultID: {number}
        timeStamp: {string}
        numberPID: {number}
        dataFields: {object}
        traceType: {number}
        transducerType: {number}
        unit: {number}
        numberResolution: {number}
        resolutionFields: {object}
        numberTrace: {number}
        traceSample: {string}
    }

    dataField: {
        parameterID: {number}
        lenght: {number}
        dataType: {number}
        unit: {number}
        stepNumber: {number}
        dataValue: {string}
    }

    resolutionField:{
        firstIndex: {number}
        lastIndex: {number}
        length: {number}
        dataType: {number}
        unit: {number}
        timeValue: {string}
    }
*/

const helpers = require("../helpers.js");
const padLeft = helpers.padLeft;
const padRight = helpers.padRight;
const testNul = helpers.testNul;
const processParser = helpers.processParser;
const processDataFields = helpers.processDataFields;
const processResolutionFields = helpers.processResolutionFields;
const processTraceSamples = helpers.processTraceSamples;
const serializerField = helpers.serializerField;

const MID5 = require("./0005.js");
const MID8 = require("./0008.js");

function parser(msg, opts, cb){
      
    let buffer = msg.payload;
    msg.payload = {};
 
    var position = {value: 0};
     
    switch(msg.revision){
        
        case 1: 
         
            processParser(msg, buffer, "resultID", "number", 10, position, cb) &&
            processParser(msg, buffer, "timeStamp", "string", 19, position, cb) &&
            processParser(msg, buffer, "numberPID", "number", 2, position, cb) &&
            processDataFields(msg, buffer, "fieldPID", msg.payload.numberPID, position, cb) &&
            processParser(msg, buffer, "traceType", "number", 2, position, cb) &&
            processParser(msg, buffer, "transducerType", "number", 2, position, cb) &&
            processParser(msg, buffer, "unit", "string", 3, position, cb) &&
            processParser(msg, buffer, "numberData", "number", 3, position, cb) &&
            processDataFields(msg, buffer, "fieldData", msg.payload.numberData, position, cb) &&
            processParser(msg, buffer, "numberResolution", "number", 3, position, cb) &&
            processResolutionFields(msg, buffer, "resolutionFields", msg.payload.numberResolution, position, cb) &&
            processParser(msg, buffer, "numberTrace", "number", 5, position, cb) &&
            testNul(msg, buffer, "char nul", position, cb) &&          
            processTraceSamples(msg, buffer, "sampleTrace", msg.payload.numberTrace, position, msg.payload.timeStamp, msg.payload.resolutionFields[0].timeValue, msg.payload.resolutionFields[0].unit, cb) &&
            cb(null, msg);

        break;
    }    
}

function serializer(msg, opts, cb){
    let extraData;
    let statusprocess = false;

    let position = {
        value: 0,
    };

    if (msg.isAck) {
        // MID 900 subscription data acknowledge should be sent as a MID 5 message.
        msg.mid = 5;
        msg.payload = {};
        msg.payload.midNumber = 900;
        msg.revision = 1;
        return MID5.serializer(msg, {}, cb);
    }

    msg.revision = msg.revision || 1;

    switch (msg.revision) {
      case 1:
          if (msg.payload && msg.payload.midNumber === 900 && msg.payload.extraData) {
              // keep legacy behavior when user serializes their own MID 8 message.
              msg.mid = 8;
              msg.revision = 1;
              msg.payload.dataLength = msg.payload.extraData.length;
              return MID8.serializer(msg, {}, cb);
          }

          if (!msg.payload || !msg.payload.traceTypes || msg.payload.traceTypes.length === 0) {
              cb(new Error(`[Serializer MID${msg.mid}] no trace types provided`));
              return;
          }

          // OpenProtocolSpecification_R280.pdf - Page 261
          // [0]     - 0 = "Only send new data"
          // [1-29]  - Data ID time stamp type, index type -- okay to leave blank
          // [30-31] - Number of trace types
          // [32..]  - Trace types (001, 002, ...)
          extraData = Buffer.alloc(32 + msg.payload.traceTypes.length * 3);
          extraData.write("0", 0);
          extraData.fill(" ", 1, 30);
          extraData.write(padLeft(msg.payload.traceTypes.length, 2, 10), 30);
          for (let i = 0; i < msg.payload.traceTypes.length; i++) {
              extraData.write(padLeft(msg.payload.traceTypes[i], 3, 10), 32 + i * 3);
          }

          // MID 900 subscription request should be sent as a MID 8 message.
          msg.mid = 8;
          msg.payload = {};
          msg.payload.midNumber = 900;
          msg.payload.revision = 1;
          msg.payload.dataLength = extraData.length;
          msg.payload.extraData = extraData.toString('ascii');
          msg.revision = 1;
          return MID8.serializer(msg, {}, cb);

      default:
          cb(new Error(`[Serializer MID${msg.mid}] invalid revision [${msg.revision}]`));
          break;
    }

}

function revision() {
    return [1];
}

module.exports = {
    parser, 
    serializer,
    revision
};
