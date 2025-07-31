"use strict";
/*jshint esversion: 6, node: true*/

const {
    expect
} = require('chai');

const MID = require('../src/mid/0900.js');

describe("MID 0900", () => {

    it("parser rev 1 with values", (done) => {

        let msg = {
            mid: 900,
            revision: 1,
            payload: Buffer.from(
                "1234567890" + // resultID
                    "2018-06-04:01:00:00" + // timeStamp
                    "001" + // numberPID
                    "00002003050008888ABC" + // fieldPID[0]: Station ID = "ABC"
                    "02" + // traceType
                    "08" + // transducerType
                    "005" + // unit = MN·m
                    "001" + // numberData
                    "02213003010016666008" + // fieldData[0]: Coefficient = 1/8
                    "001" + // numberResolution
                    "54321987650050120100015" + // resolutionFields[0]: 15 min
                    "00003" + // numberTrace
                    "\u0000" + // (nul)
                    "xxxxxx" // sampleTrace[0-2]
            )
        };

        msg.payload.writeInt16BE(12,   114); // sampleTrace[0].value = 1.5
        msg.payload.writeInt16BE(8004, 116); // sampleTrace[1].value = 1000.5
        msg.payload.writeInt16BE(-58,  118); // sampleTrace[2].value = -7.25

        MID.parser(msg, {}, (err, data) => {

            if(err){
                console.log(err);
            }

            expect(data).to.be.deep.equal({
                mid: 900,
                revision: 1,
                payload: {
                    resultID: 1234567890,
                    timeStamp: "2018-06-04:01:00:00",
                    numberPID: 1,
                    fieldPID: [{
                        parameterID: "00002",
                        parameterName: "Station ID",
                        length: 3,
                        dataType: 5,
                        unit: "000",
                        unitName: "No unit",
                        stepNumber: 8888,
                        dataValue: "ABC"
                    }],
                    traceType: 2,
                    traceTypeName: "Torque",
                    transducerType: 8,
                    unit: "005",
                    unitName: "MN·m",
                    numberData: 1,
                    fieldData: [{
                        parameterID: "02213",
                        parameterName: "Coefficient",
                        length: 3,
                        dataType: 1,
                        unit: "001",
                        unitName: "N·m",
                        stepNumber: 6666,
                        dataValue: "008"
                    }],
                    numberResolution: 1,
                    resolutionFields: [{
                        firstIndex: 54321,
                        lastIndex: 98765,
                        length: 5,
                        dataType: 1,
                        unit: "201",
                        unitName: "min",
                        timeValue: "00015"
                    }],
                    numberTrace: 3,
                    sampleTrace: [
                        {
                            timeStamp: new Date("2018-06-04:01:00:00"),
                            value: 1.5,
                        },
                        {
                            timeStamp: new Date("2018-06-04:01:15:00"),
                            value: 1000.5,
                        },
                        {
                            timeStamp: new Date("2018-06-04:01:30:00"),
                            value: -7.25,
                        },
                    ],
                }
            });

            done();
        });
    });

});
