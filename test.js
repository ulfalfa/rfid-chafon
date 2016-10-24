var RFID = require('./index');

let rfid = new RFID('/dev/tty.usbserial');

/*rfid.open()
	.then((result) => {

		return rfid.write('AA345678AA').then(result => {
			console.log(result);
			rfid.close();
		});

	}).catch(e => {
		console.error(e);
		rfid.close();
	});
	*/

rfid.on('data', (...data) => {
	console.log('Tag read', data);
});
rfid.on('error', (data) => {
	console.log('Error', data);
});
rfid.startReading(1);


setTimeout(() => {
	rfid.close();

}, 10000);
