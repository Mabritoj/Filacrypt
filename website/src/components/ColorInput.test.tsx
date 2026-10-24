import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ColorInput } from './ColorInput';
import { Field } from './Field';

describe('ColorInput', () => {
  it('names the picker and the hex box from its label', () => {
    render(<ColorInput value="#cf9161" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Color')).toHaveValue('#cf9161');
    expect(screen.getByRole('textbox', { name: 'Color hex code' })).toHaveValue('#cf9161');
  });

  it('reports edits from either control', () => {
    const onChange = vi.fn();
    render(<ColorInput value="#cf9161" onChange={onChange} label="Filament color" />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Filament color hex code' }), {
      target: { value: '#000000' },
    });
    fireEvent.input(screen.getByLabelText('Filament color'), { target: { value: '#ffffff' } });
    expect(onChange).toHaveBeenNthCalledWith(1, '#000000');
    expect(onChange).toHaveBeenNthCalledWith(2, '#ffffff');
  });

  it('keeps the picker on a valid color while the hex is mid-edit', () => {
    render(<ColorInput value="#cf9" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'Color hex code' })).toHaveValue('#cf9');
    expect(screen.getByLabelText('Color')).toHaveValue('#888888');
  });

  it('lets an enclosing Field label the picker, without sharing its id with the hex box', () => {
    render(
      <Field label="Filament color" hint="As printed on the spool">
        <ColorInput value="#cf9161" onChange={vi.fn()} label="Filament color" />
      </Field>,
    );
    const picker = screen.getByLabelText('Filament color');
    expect(picker).toHaveAttribute('type', 'color');
    expect(picker).toHaveAccessibleDescription('As printed on the spool');
    const hex = screen.getByRole('textbox', { name: 'Filament color hex code' });
    expect(hex.id).not.toBe(picker.id);
    expect(hex).not.toHaveAccessibleDescription();
  });
});
