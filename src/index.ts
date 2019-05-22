import { ChafonReader } from './chafon'
import { D302Reader } from './d302'
import { RFIDReader } from './rfid'

export * from './chafon'
export * from './d302'
export * from './rfid'

export function createRfid(type: 'chafon' | 'd302', port: string): RFIDReader {
  if (type === 'chafon') {
    return new ChafonReader(port)
  } else if (type === 'd302') {
    return new D302Reader(port)
  }
}
