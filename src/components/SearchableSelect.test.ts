import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeAll, describe, expect, it } from 'vitest';
import data from '@/data/ntb-data.json';
import SearchableSelect from './SearchableSelect.vue';

beforeAll(() => {
  // jsdom has no layout engine; reka-ui measures with these.
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
});

const items = data.categories.map((c) => ({ value: c.code, label: c.title }));

describe('SearchableSelect with the 22 KBLI categories', () => {
  it('lists every category, including Q (PENDIDIKAN)', async () => {
    const wrapper = mount(SearchableSelect, { props: { items, placeholder: 'Pilih kategori', searchPlaceholder: 'Cari', modelValue: null }, attachTo: document.body });
    await wrapper.get('[role=combobox]').trigger('click');
    await nextTick();
    await new Promise((r) => setTimeout(r, 50));

    const options = [...document.body.querySelectorAll('[role=option]')].map((o) => o.textContent?.trim() ?? '');
    expect(options).toHaveLength(22);
    expect(options.some((o) => o.startsWith('Q') && o.includes('PENDIDIKAN'))).toBe(true);
    wrapper.unmount();
  });
});
