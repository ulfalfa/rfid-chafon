var RFID = require('./index');

let rfid = new RFID('/dev/tty.usbserial');

rfid.open()
	.then((result) => {

		return rfid.write('AA345678AA').then(result => {
			console.log(result);
			rfid.close();
		});

	}).catch(e => {
		console.error(e);
		rfid.close();
	});
