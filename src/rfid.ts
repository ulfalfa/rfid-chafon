import * as SerialPort from 'serialport'
import { parsers } from 'serialport'
import * as Debug from 'debug'
import { EventEmitter } from 'events'
import { ChafonParser } from './rfid-transform'

import { from, Observable, using, interval, timer } from 'rxjs'
import { mergeMap } from 'rxjs/operators'

const CMD_INFO = 'AADD0003010203'

const CMD_BEEP = 'AADD000401030A08'

const CMD_READ = 'AADD0003010C0D'

const debug = Debug('rfid-chafon:rfid')

export class RFID extends EventEmitter {
  _readInterval: any
  serialPort: SerialPort

  parser: ChafonParser

  constructor(port = '/dev/ttyUSB0') {
    super()
    this._readInterval = null

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
    }) // this is the openImmediately flag [default is true]
    this.parser = new ChafonParser()
    this.serialPort.pipe(this.parser)
  }

  doCommand(cmdString: string) {
    return new Promise((resolve, reject) => {
      if (!this.serialPort.isOpen) {
        reject('not ready')
        return
      }

      const cmd = Buffer.from(cmdString, 'hex')
      this.parser.once('data', resolve)

      this.serialPort.write(cmd, (err, result) => {
        if (err) {
          reject(err)
        }
      })
    })
  }

  beep() {
    return this.doCommand(CMD_BEEP)
  }

  read() {
    return this.doCommand(CMD_READ)

    /*   return new Promise((resolve, reject) => {
      if (!this.serialPort.isOpen) {
        reject('not ready')
        return
      }
      const cmd = Buffer.from('AADD0003010C0D', 'hex')
      this.parser.once('data', data => {
        debug(`data read ${data.id} ${data.crc} ${data.length}`, data)
        if (!data.crc) {
          reject('CRCERROR')
        } else {
          debug('data', data)
          resolve(
            data.data
              .slice(3, 8)
              .toString('hex')
              .toUpperCase()
          )
        }
      })
      this.serialPort.write(cmd, (err, result) => {
        if (err) {
          reject(err)
        }
      })
    })*/
  }

  /*calcChecksum (buffer: Buffer) {
    let csum = 0;ç
    for (const part of buffer) {
      // tslint:disable-next-line
      csum = csum ^ part
      cmdBuffer[pos] = part
      pos++
      // double the AAs
      if (part.toString(16) === 'aa') {
        cmdBuffer[pos] = part
        pos++
      }
    }

  }*/

  atomicWrite(id) {
    return new Promise((resolve, reject) => {
      if (!this.serialPort.isOpen) {
        reject('not ready')
        return
      }
      if (typeof id !== 'string' || id.length !== 10) {
        reject('Wrong ID ' + id + ' length:' + id.length)
      } else {
        const cmdBuffer = Buffer.alloc(50)
        cmdBuffer.write('AADD0009', 'hex')
        let pos = 4
        // now write the compose the id for checksum
        const idBuffer = Buffer.alloc(8)
        idBuffer.write('030C00', 'hex')
        idBuffer.write(id, 3, 'hex')

        debug('idBuffer', idBuffer)

        // now calculate checksum and fill cmdBuffer and doubling the 0xAA
        let csum = 0
        for (const part of idBuffer) {
          // tslint:disable-next-line
          csum = csum ^ part
          cmdBuffer[pos] = part
          pos++
          // double the AAs
          if (part.toString(16) === 'aa') {
            cmdBuffer[pos] = part
            pos++
          }
        }

        cmdBuffer[pos] = csum
        pos++
        this.parser.once('data', resolve)
        debug('writing', cmdBuffer.slice(0, pos))

        this.serialPort.write(cmdBuffer.slice(0, pos), (err, result) => {
          if (err) {
            reject(err)
          }
        })
      }
    })
  }

  write(id) {
    return this.atomicWrite(id)
      .then(() => {
        return this.read()
      })
      .then(data => {
        debug('Compare data', id, data)
        if (data && data === id.toUpperCase()) {
          return data
        } else {
          if (!data) {
            throw new Error('NOTAG')
          } else {
            throw new Error('Unknown Error')
          }
        }
      })
  }

  getInfo(): Promise<any> {

    return this.doCommand(CMD_INFO)
  /*  return new Promise((resolve, reject) => {
      if (!this.serialPort.isOpen) {
        reject('not ready')
        return
      }
      const cmd = Buffer.from('AADD0003010203', 'hex')

      this.parser.once('data', chunk => {
        debug('Chunk parsed', chunk)
        resolve(chunk.data.toString('utf8'))
      })

      this.serialPort.write(cmd, (err, result) => {
        debug('CMD written', cmd)
        if (err) {
          reject(err)
        }
      })
    })*
  }

  open() {
    return new Promise((resolve, reject) => {
      this.serialPort.open(err => {
        if (err) {
          reject(err)
        } else {
          debug('Openend')
          resolve()
        }
      })
    })
  }

  close() {
    this.serialPort.close()
  }

  observe(anInterval = 5) {
    return from(this.open()).pipe(
      mergeMap(() => timer(0, anInterval * 1000)),
      mergeMap(() => this.read())
    )
  }

  startReading(interval = 5) {
    return this.open().then(() => {
      this._readInterval = setInterval(() => {
        this.read()
          .then(data => {
            debug('data', data)
            this.emit('data', data)
          })
          .catch(e => {
            this.emit('error', e)
          })
      }, interval * 1000)
    })
  }

  stopReading() {
    if (this._readInterval) {
      clearInterval(this._readInterval)
    }
  }
}
