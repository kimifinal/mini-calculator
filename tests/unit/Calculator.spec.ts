import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Calculator from '../../src/components/Calculator.vue';

// Mounts the component in jsdom and drives it by clicking the same buttons a
// user would. It asserts on the rendered display text, so it exercises the
// full component wiring (state + handlers) end to end.
//
// Note: DOM event dispatch in jsdom is asynchronous, so every click must be
// awaited — otherwise the assertion runs before Vue has flushed the reactive
// update and the display still shows the stale value.

async function pressButton(
  wrapper: ReturnType<typeof mount>,
  label: string,
) {
  const btn = wrapper
    .findAll('button')
    .find((b) => b.attributes('data-label') === label);
  if (!btn) throw new Error(`button with data-label="${label}" not found`);
  await btn.trigger('click');
}

function displayText(wrapper: ReturnType<typeof mount>): string {
  const el = wrapper.find('[data-testid="display"]');
  return el.text().trim();
}

// Type a sequence of button labels into the calculator, e.g. "1+2)".
// Each character is sent to the matching button via its data-label.
// '(' and ')' both map to the single smart "( )" button.
async function typeExpr(
  wrapper: ReturnType<typeof mount>,
  expr: string,
) {
  for (const ch of expr) {
    // skip spaces the test author used for readability
    if (ch === ' ') continue;
    const label = ch === '(' || ch === ')' ? '( )' : ch;
    await pressButton(wrapper, label);
  }
}

describe('Calculator component', () => {
  it('mounts and shows 0', () => {
    const wrapper = mount(Calculator);
    expect(displayText(wrapper)).toBe('0');
  });

  it('adds: 5 + 3 = 8 (spec)', async () => {
    const wrapper = mount(Calculator);
    await pressButton(wrapper, '5');
    await pressButton(wrapper, '+');
    await pressButton(wrapper, '3');
    await pressButton(wrapper, '=');
    expect(displayText(wrapper)).toBe('8');
  });

  it('divides: 10 / 2 = 5 (spec)', async () => {
    const wrapper = mount(Calculator);
    await pressButton(wrapper, '1');
    await pressButton(wrapper, '0');
    await pressButton(wrapper, '/');
    await pressButton(wrapper, '2');
    await pressButton(wrapper, '=');
    expect(displayText(wrapper)).toBe('5');
  });

  it('shows Error on 10 / 0 (spec)', async () => {
    const wrapper = mount(Calculator);
    await pressButton(wrapper, '1');
    await pressButton(wrapper, '0');
    await pressButton(wrapper, '/');
    await pressButton(wrapper, '0');
    await pressButton(wrapper, '=');
    expect(displayText(wrapper)).toBe('Error');
  });

  it('resets to 0 after AC', async () => {
    const wrapper = mount(Calculator);
    await pressButton(wrapper, '9');
    await pressButton(wrapper, '9');
    expect(displayText(wrapper)).toBe('99');
    await pressButton(wrapper, 'AC');
    expect(displayText(wrapper)).toBe('0');
  });

  it('supports decimals: 1.5 + 2.5 = 4', async () => {
    const wrapper = mount(Calculator);
    await pressButton(wrapper, '1');
    await pressButton(wrapper, '.');
    await pressButton(wrapper, '5');
    await pressButton(wrapper, '+');
    await pressButton(wrapper, '2');
    await pressButton(wrapper, '.');
    await pressButton(wrapper, '5');
    await pressButton(wrapper, '=');
    expect(displayText(wrapper)).toBe('4');
  });

  it('emits result-calculated with the computed value', async () => {
    const wrapper = mount(Calculator);
    await pressButton(wrapper, '5');
    await pressButton(wrapper, '+');
    await pressButton(wrapper, '3');
    await pressButton(wrapper, '=');
    expect(wrapper.emitted('result-calculated')).toEqual([['8']]);
  });

  it('computes percentage: 50 % = 0.5', async () => {
    const wrapper = mount(Calculator);
    await pressButton(wrapper, '5');
    await pressButton(wrapper, '0');
    await pressButton(wrapper, '%');
    expect(displayText(wrapper)).toBe('0.5');
  });

  describe('expression mode (parentheses)', () => {
    it('opens on "(" and keeps the running expression visible', async () => {
      const wrapper = mount(Calculator);
      await typeExpr(wrapper, '(1+2)*(3+4)');
      expect(displayText(wrapper)).toBe('(1+2)*(3+4)');
    });

    it('evaluates a multi-term expression: (1+2)*(3+4) = 21', async () => {
      const wrapper = mount(Calculator);
      await typeExpr(wrapper, '(1+2)*(3+4)');
      await pressButton(wrapper, '=');
      expect(displayText(wrapper)).toBe('21');
    });

    it('respects precedence inside the expression: (2+3*4) = 14', async () => {
      const wrapper = mount(Calculator);
      await typeExpr(wrapper, '(2+3*4)');
      await pressButton(wrapper, '=');
      expect(displayText(wrapper)).toBe('14');
    });

    it('smart paren refuses to open a group after a bare digit', async () => {
      // "()" after a digit cannot start a fresh group (that would be the
      // malformed "2(3"), so it is a no-op and the display is left as "2".
      const wrapper = mount(Calculator);
      await pressButton(wrapper, '2');
      await pressButton(wrapper, '( )');
      expect(displayText(wrapper)).toBe('2');
    });

    it('returns "Error" for an unbalanced open paren', async () => {
      // "(" then "3" never closed; the parser rejects the dangling '('.
      const wrapper = mount(Calculator);
      await pressButton(wrapper, '( )');
      await pressButton(wrapper, '3');
      await pressButton(wrapper, '=');
      expect(displayText(wrapper)).toBe('Error');
    });

    it('falls back to legacy mode after a successful expression calc', async () => {
      const wrapper = mount(Calculator);
      await typeExpr(wrapper, '(1+2)');
      await pressButton(wrapper, '=');
      expect(displayText(wrapper)).toBe('3');
      // Now in legacy mode: continue as a two-step calc starting fresh.
      await pressButton(wrapper, '5');
      await pressButton(wrapper, '+');
      await pressButton(wrapper, '3');
      await pressButton(wrapper, '=');
      expect(displayText(wrapper)).toBe('8');
    });

    it('AC returns to legacy mode and shows 0', async () => {
      const wrapper = mount(Calculator);
      await typeExpr(wrapper, '(999+1)');
      expect(displayText(wrapper)).toBe('(999+1)');
      await pressButton(wrapper, 'AC');
      expect(displayText(wrapper)).toBe('0');
    });
  });

  describe('backspace button', () => {
    it('deletes one character in legacy mode: 123 -> 12', async () => {
      const wrapper = mount(Calculator);
      await pressButton(wrapper, '1');
      await pressButton(wrapper, '2');
      await pressButton(wrapper, '3');
      expect(displayText(wrapper)).toBe('123');
      await pressButton(wrapper, 'backspace');
      expect(displayText(wrapper)).toBe('12');
    });

    it('deletes one character in expression mode: (1+2 -> (1+', async () => {
      const wrapper = mount(Calculator);
      await typeExpr(wrapper, '(1+2');
      expect(displayText(wrapper)).toBe('(1+2');
      await pressButton(wrapper, 'backspace');
      expect(displayText(wrapper)).toBe('(1+');
    });

    it('does not go below a single 0 in legacy mode', async () => {
      const wrapper = mount(Calculator);
      expect(displayText(wrapper)).toBe('0');
      await pressButton(wrapper, 'backspace');
      expect(displayText(wrapper)).toBe('0');
    });
  });

  describe('negate (±) button', () => {
    it('toggles the sign in legacy mode: 5 -> -5 -> 5', async () => {
      const wrapper = mount(Calculator);
      await pressButton(wrapper, '5');
      expect(displayText(wrapper)).toBe('5');
      await pressButton(wrapper, '±');
      expect(displayText(wrapper)).toBe('-5');
      await pressButton(wrapper, '±');
      expect(displayText(wrapper)).toBe('5');
    });

    it('is a no-op when the display is 0', async () => {
      const wrapper = mount(Calculator);
      expect(displayText(wrapper)).toBe('0');
      await pressButton(wrapper, '±');
      expect(displayText(wrapper)).toBe('0');
      await pressButton(wrapper, '±');
      expect(displayText(wrapper)).toBe('0');
    });

    it('is a no-op when the display is Error', async () => {
      const wrapper = mount(Calculator);
      // 10 / 0 -> "Error"
      await pressButton(wrapper, '1');
      await pressButton(wrapper, '0');
      await pressButton(wrapper, '/');
      await pressButton(wrapper, '0');
      await pressButton(wrapper, '=');
      expect(displayText(wrapper)).toBe('Error');
      // ± must not corrupt the error state or turn it into "0"
      await pressButton(wrapper, '±');
      expect(displayText(wrapper)).toBe('Error');
    });

    it('is a no-op on a partial expression (expression mode)', async () => {
      const wrapper = mount(Calculator);
      // Enter expression mode and build a partial, ambiguous expression.
      await typeExpr(wrapper, '(5+');
      expect(displayText(wrapper)).toBe('(5+');
      // ± on a partial expression is unambiguous-free, so it is a no-op.
      await pressButton(wrapper, '±');
      expect(displayText(wrapper)).toBe('(5+');
    });
    });

    describe('calculation history', () => {
      // jsdom shares one localStorage across tests in a file, so clean the
      // namespaced key before every test for isolation.
      beforeEach(() => {
        window.localStorage.removeItem('calc-history-v1');
      });

      it('records a history entry on a successful legacy calc: 5 + 3 = 8', async () => {
        const wrapper = mount(Calculator);
        await pressButton(wrapper, '5');
        await pressButton(wrapper, '+');
        await pressButton(wrapper, '3');
        await pressButton(wrapper, '=');
        const list = wrapper.find('[data-testid="history-list"]');
        expect(list.exists()).toBe(true);
        expect(list.text().trim()).toContain('5 + 3 = 8');
        const entries = wrapper.findAll('[data-test="history-entry"]');
        expect(entries).toHaveLength(1);
        expect(entries[0].text().trim()).toBe('5 + 3 = 8');
        // The record is also persisted to the namespaced localStorage key.
        expect(JSON.parse(window.localStorage.getItem('calc-history-v1') || '[]'))
          .toEqual(['5 + 3 = 8']);
      });

      it('loading a history entry puts its result (8) back into the display', async () => {
        const wrapper = mount(Calculator);
        await pressButton(wrapper, '5');
        await pressButton(wrapper, '+');
        await pressButton(wrapper, '3');
        await pressButton(wrapper, '=');
        await pressButton(wrapper, 'history'); // toggle panel visible
        const entry = wrapper.find('[data-test="history-entry"]');
        expect(entry.exists()).toBe(true);
        await entry.trigger('click');
        expect(displayText(wrapper)).toBe('8');
        // Like a just-pressed '=', the next digit starts fresh (does not append).
        await pressButton(wrapper, '7');
        expect(displayText(wrapper)).toBe('7');
      });

      it('does NOT record an Error result (10 / 0 = Error)', async () => {
        const wrapper = mount(Calculator);
        await pressButton(wrapper, '1');
        await pressButton(wrapper, '0');
        await pressButton(wrapper, '/');
        await pressButton(wrapper, '0');
        await pressButton(wrapper, '=');
        expect(displayText(wrapper)).toBe('Error');
        expect(wrapper.find('[data-testid="history-list"]').text().trim()).toBe('');
        expect(wrapper.findAll('[data-test="history-entry"]')).toHaveLength(0);
        // No error line was written to storage.
        const stored = JSON.parse(
          window.localStorage.getItem('calc-history-v1') || '[]',
        ) as string[];
        expect(stored.filter((s) => s.includes('Error'))).toHaveLength(0);
      });

      it('clearing history empties the list AND the localStorage copy', async () => {
        const wrapper = mount(Calculator);
        await pressButton(wrapper, '5');
        await pressButton(wrapper, '+');
        await pressButton(wrapper, '3');
        await pressButton(wrapper, '=');
        expect(wrapper.findAll('[data-test="history-entry"]')).toHaveLength(1);
        expect(window.localStorage.getItem('calc-history-v1')).not.toBeNull();
        await pressButton(wrapper, 'clear-history');
        expect(wrapper.findAll('[data-test="history-entry"]')).toHaveLength(0);
        expect(window.localStorage.getItem('calc-history-v1')).toBeNull();
      });

      it('picks up an entry already present in localStorage on mount', async () => {
        // Seed storage BEFORE the component mounts (spec: "on mount").
        window.localStorage.setItem(
          'calc-history-v1',
          JSON.stringify(['7 - 4 = 3']),
        );
        const wrapper = mount(Calculator);
        expect(wrapper.find('[data-testid="history-list"]').exists()).toBe(true);
        const entries = wrapper.findAll('[data-test="history-entry"]');
        expect(entries).toHaveLength(1);
        expect(entries[0].text().trim()).toBe('7 - 4 = 3');
      });

      it('caps the history at 50 entries (oldest dropped)', async () => {
        const wrapper = mount(Calculator);
        // 51 distinct records: each iter does AC, types n = i+1, then "+ 0 =".
        // After 51 records the list must be capped at 50, newest first, with the
        // 51st record ("51 + 0 = 51") on top and the 1st ("1 + 0 = 1") pushed out.
        for (let i = 0; i < 51; i++) {
          await pressButton(wrapper, 'AC');
          for (const ch of (i + 1).toString()) {
            await pressButton(wrapper, ch);
          }
          await pressButton(wrapper, '+');
          await pressButton(wrapper, '0');
          await pressButton(wrapper, '=');
        }
        const entries = wrapper.findAll('[data-test="history-entry"]');
        expect(entries.length).toBeLessThanOrEqual(50);
        expect(entries).toHaveLength(50);
        expect(entries[0].text().trim()).toBe('51 + 0 = 51');
      });
    });
    });
