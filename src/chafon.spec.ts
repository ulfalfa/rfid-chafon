import { serial, TestInterface } from 'ava'

import { ChafonReader as RFID } from './chafon'
import { take, tap } from 'rxjs/operators'

interface Context {
  rfid: RFID
}

const test = serial as TestInterface<Context>

const PORT = '/dev/tty.usbserial'

test.beforeEach(async t => {
  const rfid = new RFID(PORT)
  await rfid.open()

  t.context = {
    rfid,
  }
})

test.afterEach(async t => {
  await t.context.rfid.close()
})

test('can get Info', async t => {
  const rfid = t.context.rfid

  const result = await rfid.getInfo()
  t.deepEqual(result, 'ID card reader & writer6')
})

test('can read tag', async t => {
  const rfid = t.context.rfid

  const result = await rfid.read()
  t.log(result)
  t.pass()
})
test('observe', t => {
  const rfid = t.context.rfid

  t.plan(10)

  return rfid.observe().pipe(
    take(10),
    tap(data => {
      t.log('Read', data)
      t.pass()
    })
  )
})
test('write and read', async t => {
  const rfid = t.context.rfid

  await rfid.write('012345679A', { safe: false })

  const result = await rfid.read()
  t.is(result, '012345679A')
})
test.only('safe write with default', async t => {
  const rfid = t.context.rfid

  const result = await rfid.write('012345679B')
  t.true(typeof result === 'undefined')
})

test('safe write', async t => {
  const rfid = t.context.rfid

  const result = await rfid.write('012345679B', { safe: true })
  t.true(typeof result === 'undefined')
})
