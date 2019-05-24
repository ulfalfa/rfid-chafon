import * as SerialPort from 'serialport'
import { parsers } from 'serialport'
import * as Debug from 'debug'
import { EventEmitter } from 'events'

import { from, Observable, using, interval, timer } from 'rxjs'
import { mergeMap } from 'rxjs/operators'
import { RFIDReader } from './rfid'

const CMD_INFO = '020100000303'

const CMD_BEEP = '020100000303'

const CMD_READ = '0201a40b0000000000000000000000ac03'

const debug = Debug('ulfalfa:rfid:d302')

export class D302Reader extends RFIDReader {
  constructor(port = '/dev/ttyUSB0') {
    super(port, 4800)
  }

  protected calcCRC(data: Buffer) {
    let csum = 0
    for (let i = 0; i < data.length - 2; i++) {
      // tslint:disable-next-line
      csum = csum ^ data[i]
    }
    return csum
  }

  read(): Promise<string> {
    debug('Atomic Read')
    const timeout = new Promise((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id)
        this.serialPort.removeAllListeners()
        reject(`Timed out reading code `)
      }, 1000)
    })
    return Promise.race([
      timeout,
      new Promise((resolve, reject) => {
        const cmd = Buffer.from(CMD_READ, 'hex')
        this.serialPort.once('data', (data: Buffer) => {
          debug(`data read`, data)

          if (this.calcCRC(data) !== data[data.length - 2]) {
            throw new Error(`Read error - checksum mismatch`)
          }

          const code = data
            .slice(4, 9)
            .toString('hex')
            .toUpperCase()

          debug('Code read', code)
          resolve(code)
        })
        this.serialPort.write(cmd, (err, result) => {
          if (err) {
            reject(err)
          }
        })
      }),
    ]).then(data => {
      return data as string
    })
  }

  protected atomicWrite(id): Promise<void> {
    debug('Atomic Write', id)
    return new Promise((resolve, reject) => {
      const cmdBuffer = Buffer.from('0201a50b000000000000' + id + 'AA03', 'hex')

      // now calculate checksum and fill cmdBuffer and doubling the 0xAA
      cmdBuffer[cmdBuffer.length - 2] = this.calcCRC(cmdBuffer)

      debug('Command Buffer', cmdBuffer.toString('hex'))
      this.serialPort.once('data', (data: Buffer) => {
        debug('AWrite Returned', data.toString('hex'))
        resolve()
      })

      this.serialPort.write(cmdBuffer, (err, result) => {
        if (err) {
          reject(err)
        }
      })
    })
  }

  getInfo(): Promise<string> {
    const timeout = new Promise((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id)
        reject(`Timed out reading code `)
      }, 1000)
    })

    return Promise.race([
      timeout,
      new Promise((resolve, reject) => {
        if (!this.serialPort.isOpen) {
          reject('not ready')
          return
        }

        const cmd = Buffer.from(CMD_INFO, 'hex')

        this.serialPort.once('data', data => {
          if (Buffer.compare(data, cmd) === 0) {
            resolve('OK')
          } else {
            reject('This is not a D302 RFID Reader')
          }
        })

        this.serialPort.write(cmd, (err, result) => {
          debug('CMD written', cmd)
          if (err) {
            reject(err)
          }
        })
      }),
    ]).then(data => data as string)
  }
}
