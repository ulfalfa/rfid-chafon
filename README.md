#RFID-Chafon

I recently bought a usb rfid reader. The "driver" and the "app" were propietaries solutions for windows xp and not usable by mac or linux. So I decided to reverse engineer the protocol and implement this small node js lib.

## Installation

```bash
$ npm install debug
```

## Usage


Example _readtag.js_:

```js
var RFID = require('./index');

let rfid = new RFID('/dev/tty.usbserial');

rfid.open()
	.then(() => {
		return rfid.read().then(result => {
			console.log(result);
			rfid.close();
		});
	}).catch(e => {
		console.error(e);
		rfid.close();
	});

```

Example _writetag.js_:

```js
var RFID = require('./index');

let rfid = new RFID('/dev/tty.usbserial');

rfid.open()
	.then(() => {
		return rfid.write().then(result => {
			console.log(result);
			rfid.close();
		});
	}).catch(e => {
		console.error(e);
		rfid.close();
	});

```
