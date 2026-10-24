import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './Field';
import { NumberInput } from './NumberInput';
import { Select } from './Select';
import { TextInput } from './TextInput';

describe('Field', () => {
  it('labels the control it wraps', () => {
    render(
      <Field label="Email">
        <TextInput />
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('describes the control with its hint', () => {
    render(
      <Field label="Username" hint="Shown to your workspace">
        <TextInput />
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Username' })).toHaveAccessibleDescription(
      'Shown to your workspace',
    );
  });

  it('replaces the hint with the error and marks the control invalid', () => {
    render(
      <Field label="Username" hint="Shown to your workspace" error="Already taken">
        <TextInput />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Username' });
    expect(input).toHaveAccessibleDescription('Already taken');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Shown to your workspace')).not.toBeInTheDocument();
  });

  it('leaves aria-invalid off when valid', () => {
    render(
      <Field label="Name">
        <TextInput />
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('aria-invalid');
  });

  it('keeps an explicit id and merges an existing description', () => {
    render(
      <>
        <span id="extra">Extra help</span>
        <Field label="Name" id="name-input" hint="Your full name">
          <TextInput aria-describedby="extra" />
        </Field>
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveAttribute('id', 'name-input');
    expect(input).toHaveAccessibleDescription('Extra help Your full name');
  });

  it('wires selects and number inputs the same way', () => {
    render(
      <>
        <Field label="Brand">
          <Select>
            <option>Prusament</option>
          </Select>
        </Field>
        <Field label="Low-stock alert below" error="Must be positive">
          <NumberInput unit="grams" defaultValue={-1} />
        </Field>
      </>,
    );
    expect(screen.getByRole('combobox', { name: 'Brand' })).toBeInTheDocument();
    const number = screen.getByRole('spinbutton', { name: 'Low-stock alert below' });
    expect(number).toHaveAccessibleDescription('Must be positive');
    expect(number).toHaveAttribute('aria-invalid', 'true');
  });
});
