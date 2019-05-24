import * as SerialPort from 'serialport'

import { Observable, interval } from 'rxjs'
import { switchMap, filter, distinctUntilChanged } from 'rxjs/operators'

export abstract class RFIDReader {
  protected serialPort: SerialPort

  get isOpen(): boolean {
    return this.serialPort.isOpen
  }

  constructor(port = '/dev/ttyUSB0', baudRate: number) {
    this.serialPort = new SerialPort(port, {
      baudRate,
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
  }

  abstract getInfo(): Promise<string>

  protected abstract atomicWrite(code: string): Promise<void>
  abstract read(): Promise<string>

  async write(
    code: string,
    options: { safe: boolean } = { safe: true }
  ): Promise<void> {
    if (code.length !== 10) {
      throw new Error(`Length code ${code} expected 10 but is ${code.length}`)
    }

    return this.atomicWrite(code).then(() => {
      if (options.safe) {
        return this.read().then(readCode => {
          if (readCode !== code) {
            throw new Error(
              `Code ${code} was not written (current ${readCode})`
            )
          }
        })
      }
    })
  }

  observe(intervalSec: number = 1): Observable<string> {
    return interval(intervalSec * 1000).pipe(
      switchMap(() => {
        return this.read().catch(e => {
          // do nothing
          return undefined
        })
      }),
      filter(data => !!data)
    )
  }

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.serialPort.open(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.serialPort.close(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}
