import { hashPin, isWeakPin, verifyPin } from './pin.js';

describe('health worker PINs', () => {
  it('verifies the right PIN and rejects a wrong one', () => {
    const stored = hashPin('2468');
    expect(verifyPin('2468', stored)).toBe(true);
    expect(verifyPin('8642', stored)).toBe(false);
  });

  it('never stores the PIN itself', () => {
    expect(JSON.stringify(hashPin('2468'))).not.toContain('2468');
  });

  it('fails safely when no PIN is set', () => {
    expect(verifyPin('2468', { salt: null, hash: null })).toBe(false);
  });

  it('rejects repeated digits and runs', () => {
    for (const pin of ['0000', '1111', '1234', '9876', '12a4', '123']) expect(isWeakPin(pin)).toBe(true);
    for (const pin of ['2468', '5170', '1357']) expect(isWeakPin(pin)).toBe(false);
  });
});
