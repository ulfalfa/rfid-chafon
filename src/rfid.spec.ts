import anyTest, { serial, Macro, TestInterface } from 'ava'

import { RFID } from './rfid'
import { tap, map, take } from 'rxjs/operators'
const test = anyTest

test.only('Get Info', async t => {
  const rfid = new RFID('/dev/tty.usbserial')

  await rfid.open()
  const result = await rfid.getInfo()
  t.log(Buffer.from(result, 'utf8'))
  t.log(Buffer.from('ID card reader & writer6', 'ascii'))
  t.log(Buffer.from('ID card reader & writer6', 'ucs2'))
  t.log(Buffer.from('ID card reader & writer6', 'binary'))
  t.is(result, 'ID card reader & writer6')
  // t.is(result, 'ID card reader & writer6')

  // ulf 010C93215B
  // jutta 010C932300
})

test('Connect', async t => {
  const rfid = new RFID('/dev/tty.usbserial')

  await rfid.open()
  let result
  // await rfid.beep()
  result = await rfid.atomicWrite('010C93215B')
  // t.log(result)
  result = await rfid.read()
  t.log(result)
  t.is(result, '010C93215B')
  // t.is(result, 'ID card reader & writer6')

  // ulf 010C93215B
  // jutta 010C932300
})

test('Observe', t => {
  const rfid = new RFID('/dev/tty.usbserial')
  t.plan(10)
  return rfid.observe().pipe(
    take(10),
    map(data => {
      console.log(data)
      return t.pass()
    })
  )
})
