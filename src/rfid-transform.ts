import { Transform, TransformCallback } from 'stream'
import * as Debug from 'debug'

const debug = Debug('rfid-chafon:transform')

export class ChafonParser extends Transform {
  buffer = Buffer.alloc(50)
  byteCount = 0
  constructor() {
    super({ objectMode: true })
  }

  parse() {
    const id = this.buffer.readUInt16BE(0).toString(16)
    const length = this.buffer.readUInt16BE(2)

    let csum
    let skipNext = false
    let pointer = 0
    const data = Buffer.alloc(50)
    for (let i = 4; i < this.buffer.length; i++) {
      // tslint:disable-next-line
      csum = csum ^ this.buffer[i]
      if (skipNext && this.buffer[i].toString(16) === '0') {
        skipNext = false
      } else {
        data[pointer] = this.buffer[i]
        pointer++
      }

      if (this.buffer[i].toString(16) === 'aa') {
        skipNext = true
      }
    }

    debug(
      `Message ${id} with length ${length} arrived (CSUM:${csum === 0}) = `,
      data
    )
    this.push({ data: data.slice(0, length), id, length, crc: csum === 0 })
  }

  _transform(
    chunk: Buffer,
    encoding: string,
    callback: TransformCallback
  ): void {
    debug(
      `Chunk arrived with ${chunk.length} byte, we alreay have ${
        this.byteCount
      }`,
      chunk
    )

    chunk.copy(this.buffer, this.byteCount)
    this.byteCount += chunk.length

    if (
      this.byteCount > 4 &&
      this.buffer.readUInt16BE(2) === this.byteCount - 4
    ) {
      debug('Message complete')
      this.parse()

      this.byteCount = 0
      this.buffer = Buffer.alloc(50)
    }

    callback()
  }
  _flush(callback: TransformCallback): void {
    debug('Flush called')
    callback()
  }
}
