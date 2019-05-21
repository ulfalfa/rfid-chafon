"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SerialPort = require("serialport");
const Debug = require("debug");
const events_1 = require("events");
const rfid_transform_1 = require("./rfid-transform");
const commands = {
    info: 'AADD0003010203',
    beep: 'AADD000401030A08',
    read: 'AADD0003010C0D',
};
const debug = Debug('rfid-chafon:rfid');
class RFID extends events_1.EventEmitter {
    constructor(port = '/dev/ttyUSB0') {
        super();
        this._readInterval = null;
        this.serialPort = new SerialPort(port, {
            baudRate: 38400,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            // flowControl: false,
            xon: false,
            xoff: false,
            rtscts: false,
            // bufferSize: 30,
            // parser: rfidReaderParser(),
            autoOpen: false,
        }); // this is the openImmediately flag [default is true]
        this.parser = new rfid_transform_1.ChafonParser();
        this.serialPort.pipe(new rfid_transform_1.ChafonParser());
    }
    beep() {
        return new Promise((resolve, reject) => {
            if (!this.serialPort.isOpen) {
                reject('not ready');
                return;
            }
            const cmd = Buffer.from('aadd000401030A08', 'hex');
            this.serialPort.once('data', resolve);
            this.serialPort.write(cmd, (err, result) => {
                if (err) {
                    reject(err);
                }
            });
        });
    }
    read() {
        return new Promise((resolve, reject) => {
            if (!this.serialPort.isOpen) {
                reject('not ready');
                return;
            }
            const cmd = Buffer.from('AADD0003010C0D', 'hex');
            this.serialPort.once('data', data => {
                debug('data read', data);
                if (!data.crc) {
                    reject('CRCERROR');
                }
                else if (data.data[2] === 1) {
                    resolve(undefined);
                }
                else {
                    resolve(data.data
                        .slice(3, 8)
                        .toString('hex')
                        .toUpperCase());
                }
            });
            this.serialPort.write(cmd, (err, result) => {
                if (err) {
                    reject(err);
                }
            });
        });
    }
    atomicWrite(id) {
        return new Promise((resolve, reject) => {
            if (!this.serialPort.isOpen) {
                reject('not ready');
                return;
            }
            if (typeof id !== 'string' || id.length !== 10) {
                reject('Wrong ID ' + id + ' length:' + id.length);
            }
            else {
                const cmdBuffer = Buffer.alloc(50);
                cmdBuffer.write('AADD0009', 'hex');
                let pos = 4;
                // now write the compose the id for checksum
                const idBuffer = Buffer.alloc(8);
                idBuffer.write('030C00', 'hex');
                idBuffer.write(id, 3, 'hex');
                debug('idBuffer', idBuffer);
                // now calculate checksum and fill cmdBuffer and doubling the 0xAA
                let csum = 0;
                for (const part of idBuffer) {
                    // tslint:disable-next-line
                    csum = csum ^ part;
                    cmdBuffer[pos] = part;
                    pos++;
                    // double the AAs
                    if (part.toString(16) === 'aa') {
                        cmdBuffer[pos] = part;
                        pos++;
                    }
                }
                cmdBuffer[pos] = csum;
                pos++;
                this.serialPort.once('data', resolve);
                debug('writing', cmdBuffer.slice(0, pos));
                this.serialPort.write(cmdBuffer.slice(0, pos), (err, result) => {
                    if (err) {
                        reject(err);
                    }
                });
            }
        });
    }
    write(id) {
        return this.atomicWrite(id)
            .then(() => {
            return this.read();
        })
            .then(data => {
            debug('Compare data', id, data);
            if (data && data === id.toUpperCase()) {
                return data;
            }
            else {
                if (!data) {
                    throw new Error('NOTAG');
                }
                else {
                    throw new Error('Unknown Error');
                }
            }
        });
    }
    getInfo() {
        return new Promise((resolve, reject) => {
            if (!this.serialPort.isOpen) {
                reject('not ready');
                return;
            }
            const cmd = Buffer.from('AADD0003010203', 'hex');
            this.parser.on('data', chunk => {
                debug('Chunk parsed', chunk);
                resolve(chunk);
            });
            /*this.serialPort.once('data', data => {
              debug('Data received', data.toString())
              // resolve(data.data.slice(3).toString())
            })*/
            this.serialPort.write(cmd, (err, result) => {
                debug('Write result', result);
                if (err) {
                    reject(err);
                }
            });
        });
    }
    open() {
        return new Promise((resolve, reject) => {
            this.serialPort.open(err => {
                if (err) {
                    reject(err);
                }
                else {
                    debug('Openend');
                    resolve();
                }
            });
        });
    }
    close() {
        this.serialPort.close();
    }
    startReading(interval = 5) {
        return this.open().then(() => {
            this._readInterval = setInterval(() => {
                this.read()
                    .then(data => {
                    debug('data', data);
                    this.emit('data', data);
                })
                    .catch(e => {
                    this.emit('error', e);
                });
            }, interval * 1000);
        });
    }
    stopReading() {
        if (this._readInterval) {
            clearInterval(this._readInterval);
        }
    }
}
exports.RFID = RFID;
