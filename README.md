#RFID-Chafon

I recently bought a usb rfid reader. The "driver" and the "app" were propietaries solutions for windows xp and not usable by mac or linux. So I decided to reverse engineer the protocol and implement this small node js lib.

## Installation

```bash
$ npm install debug
```

## Usage

 With `debug` you simply invoke the exported function to generate your debug function, passing it a name which will determine if a noop function is returned, or a decorated `console.error`, so all of the `console` [format string goodies](https://developer.chrome.com/devtools/docs/console-api#consolelogobject-object) you're used to work fine. A unique color is selected per-function for visibility.

Example _app.js_:

```js
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

```

Example _worker.js_:

```js
var debug = require('debug')('worker');

setInterval(function(){
  debug('doing some work');
}, 1000);
```

 The __DEBUG__ environment variable is then used to enable these based on space or comma-delimited names. Here are some examples:

  ![debug http and worker](http://f.cl.ly/items/18471z1H402O24072r1J/Screenshot.png)

  ![debug worker](http://f.cl.ly/items/1X413v1a3M0d3C2c1E0i/Screenshot.png)

#### Windows note

 On Windows the environment variable is set using the `set` command.

 ```cmd
 set DEBUG=*,-not_this
 ```

 Note that PowerShell using different syntax to set environment variables.

 ```cmd
 $env:DEBUG = "*,-not_this"
  ```

Then, run the program to be debugged as usual.


tbc...

