import { describe, it, expect } from 'vitest';
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
});
