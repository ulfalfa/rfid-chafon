/*jshint node: true*/
'use strict';


const SerialPort = require('serialport'),
	debug = require('debug')('rfid-chafon'),
	EventEmitter = require('events');

const rfidReaderParser = function () {

	var tmpBuf = new Buffer(50);
	var byteCount = 0;
	var pointer = 0;
	var csum = 0;
	var data = null;
	var skipNext = false;
	return function (emitter, inputBuf) {
		var pos = 0;
		var buffer;
		//we need at least 8 byte, before we start the real parsing (sometimes only 6 bytes arriving)
		if ((inputBuf.length + byteCount + pointer) < 4) {
			inputBuf.copy(tmpBuf, byteCount);
			byteCount = byteCount + inputBuf.length;

		} else {
			if (byteCount > 0) {
				buffer = Buffer.concat([tmpBuf.slice(0, byteCount), inputBuf]);
				byteCount = 0;

			} else {
				buffer = inputBuf;
			}

			if (!data) {
				data = {};
				data.id = buffer.readUInt16BE(pos).toString(16);
				pos = pos + 2;
				data.length = buffer.readUInt16BE(pos);
				pos = pos + 2;
				data.data = new Buffer(data.length);
				csum = 0;
			}
			var skip = 0;
			for (var i = pos; i < buffer.length; i++) {

				csum = csum ^ buffer[i];
				if (skipNext && buffer[i].toString(16) === '0') {
					skipNext = false;
				} else {
					data.data[pointer] = buffer[i];
					pointer++;
				}

				if (buffer[i].toString(16) === 'aa') {
					skipNext = true;
				}
			}

			if (pointer >= data.length) {
				pointer = 0;
				data.crc = (csum === 0);

				debug('Data received', data);
				emitter.emit('data', data);
				data = null;

			}
		}
	};
};



class RFID extends EventEmitter {

	constructor(port = '/dev/ttyUSB0') {

		super();
		this._readInterval = null;

		this.serialPort = new SerialPort(port, {
			baudrate: 38400,
			dataBits: 8,
			stopBits: 1,
			parity: 'none',
			flowControl: false,
			xon: false,
			xoff: false,
			rtscts: false,
			bufferSize: 30,
			parser: rfidReaderParser(),
			autoOpen: false

		}); // this is the openImmediately flag [default is true]

	}

	beep() {
		return new Promise((resolve, reject) => {

			if (!this.serialPort.isOpen()) {
				reject('not ready');
				return;
			}

			var cmd = new Buffer('aadd000401030A08', 'hex');
			this.serialPort.once('data', resolve);

			this.serialPort.write(cmd, function (err, result) {
				if (err) {
					reject(err);
				}

			});
		});
	}

	read() {

		return new Promise((resolve, reject) => {
			if (!this.serialPort.isOpen()) {
				reject('not ready');
				return;
			}
			var cmd = new Buffer('AADD0003010C0D', 'hex');
			this.serialPort.once('data', function (data) {
				debug('data read', data);
				if (!data.crc) {
					reject('CRCERROR');

				} else if (data.data[2] === 1) {
					resolve(undefined);

				} else {

					resolve(data.data.slice(3, 8).toString('hex').toUpperCase());


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
			if (!this.serialPort.isOpen()) {
				reject('not ready');
				return;
			}
			if (typeof (id) !== 'string' || id.length !== 10) {
				reject('Wrong ID ' + id + ' length:' + id.length);
			} else {
				var cmdBuffer = new Buffer(50);
				cmdBuffer.write('AADD0009', 'hex');
				var pos = 4;
				//now write the compose the id for checksum
				var idBuffer = new Buffer(8);
				idBuffer.write('030C00', 'hex');
				idBuffer.write(id, 3, 'hex');

				debug('idBuffer', idBuffer);

				//now calculate checksum and fill cmdBuffer and doubling the 0xAA
				var csum = 0;
				for (var i = 0; i < idBuffer.length; i++) {
					//jshint bitwise:false
					csum = csum ^ idBuffer[i];
					cmdBuffer[pos] = idBuffer[i];
					pos++;
					//double the AAs
					if (idBuffer[i].toString(16) === 'aa') {
						cmdBuffer[pos] = idBuffer[i];
						pos++;
					}

				}

				cmdBuffer[pos] = csum;
				pos++;
				this.serialPort.once('data', resolve);
				debug('writing', cmdBuffer.slice(0, pos));
				this.serialPort.write(cmdBuffer.slice(0, pos), function (err, result) {
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
			.then((data) => {
				debug('Compare data', id, data);
				if (data && data === id.toUpperCase()) {
					return (data);

				} else {
					if (!data) {
						throw (new Error('NOTAG'));
					} else {
						throw (new Error('Unknown Error'));

					}
				}
			});
	}

	getInfo() {
		return new Promise((resolve, reject) => {
			if (!this.serialPort.isOpen()) {
				reject('not ready');
				return;
			}
			var cmd = new Buffer('AADD0003010203', 'hex');
			this.serialPort.once('data', function (data) {
				resolve(data.data.slice(3).toString());
			});
			this.serialPort.write(cmd, function (err, result) {
				if (err) {
					reject(err);
				}

			});
		});

	}


	open() {
		return new Promise((resolve, reject) => {
			this.serialPort.open((err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	close() {
		this.serialPort.close();

	}

	startReading(interval = 5) {
		return this.open()
			.then(() => {

				this._readInterval = setInterval(() => {
					this.read()
						.then(data => {
							debug('data', data);
							this.emit('data', data);
						}).catch(e => {
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

module.exports = exports = RFID;
