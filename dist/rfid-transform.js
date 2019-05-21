"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const Debug = require("debug");
const debug = Debug('rfid-chafon:transform');
function rfidReaderParser() {
    const tmpBuf = Buffer.alloc(50);
    let byteCount = 0;
    let pointer = 0;
    let csum = 0;
    let data = null;
    let skipNext = false;
    return (emitter, inputBuf) => {
        let pos = 0;
        let buffer;
        // we need at least 8 byte, before we start the real parsing (sometimes only 6 bytes arriving)
        if (inputBuf.length + byteCount + pointer < 4) {
            inputBuf.copy(tmpBuf, byteCount);
            byteCount = byteCount + inputBuf.length;
        }
        else {
            if (byteCount > 0) {
                buffer = Buffer.concat([tmpBuf.slice(0, byteCount), inputBuf]);
                byteCount = 0;
            }
            else {
                buffer = inputBuf;
            }
            if (!data) {
                data = {};
                data.id = buffer.readUInt16BE(pos).toString(16);
                pos = pos + 2;
                data.length = buffer.readUInt16BE(pos);
                pos = pos + 2;
                data.data = Buffer.alloc(data.length);
                csum = 0;
            }
            const skip = 0;
            for (let i = pos; i < buffer.length; i++) {
                // tslint:disable-next-line
                csum = csum ^ buffer[i];
                if (skipNext && buffer[i].toString(16) === '0') {
                    skipNext = false;
                }
                else {
                    data.data[pointer] = buffer[i];
                    pointer++;
                }
                if (buffer[i].toString(16) === 'aa') {
                    skipNext = true;
                }
            }
            if (pointer >= data.length) {
                pointer = 0;
                data.crc = csum === 0;
                debug('Data received', data);
                emitter.emit('data', data);
                data = null;
            }
        }
    };
}
class ChafonParser extends stream_1.Transform {
    _transform(chunk, encoding, callback) {
        debug('Chunk arrived', chunk, encoding);
        this.push(chunk);
        callback(null, chunk);
    }
    _flush(callback) {
        debug('Flush called');
        callback();
    }
}
exports.ChafonParser = ChafonParser;
