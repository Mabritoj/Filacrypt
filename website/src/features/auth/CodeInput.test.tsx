import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/helpers';
import { CodeInput } from './CodeInput';

function boxes() {
  return screen.getAllByRole('textbox');
}

describe('CodeInput', () => {
  it('renders six single-character boxes', () => {
    renderWithProviders(<CodeInput value="" onChange={vi.fn()} />);

    const inputs = boxes();
    expect(inputs).toHaveLength(6);
    inputs.forEach((input) => expect(input).toHaveAttribute('maxLength', '1'));
  });

  it('typing a digit advances focus to the next box and reports the joined value', () => {
    const onChange = vi.fn();
    renderWithProviders(<CodeInput value="" onChange={onChange} />);

    const inputs = boxes();
    fireEvent.change(inputs[0], { target: { value: '4' } });

    expect(onChange).toHaveBeenCalledWith('4');
    expect(document.activeElement).toBe(inputs[1]);
  });

  it('backspace on an empty box moves focus to the previous box', () => {
    const onChange = vi.fn();
    renderWithProviders(<CodeInput value="41" onChange={onChange} />);

    const inputs = boxes();
    inputs[2].focus();
    fireEvent.keyDown(inputs[2], { key: 'Backspace' });

    expect(document.activeElement).toBe(inputs[1]);
  });

  it('pasting a full code fills every box and calls onComplete', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    renderWithProviders(<CodeInput value="" onChange={onChange} onComplete={onComplete} />);

    const inputs = boxes();
    const clipboardData = { getData: () => '419283' };
    fireEvent.paste(inputs[0], { clipboardData });

    expect(onChange).toHaveBeenCalledWith('419283');
    expect(onComplete).toHaveBeenCalledWith('419283');
  });

  it('calls onComplete once the last digit is typed', () => {
    const onComplete = vi.fn();
    renderWithProviders(<CodeInput value="41928" onChange={vi.fn()} onComplete={onComplete} />);

    const inputs = boxes();
    fireEvent.change(inputs[5], { target: { value: '3' } });

    expect(onComplete).toHaveBeenCalledWith('419283');
  });

  it('disables every box when disabled is set', () => {
    renderWithProviders(<CodeInput value="" onChange={vi.fn()} disabled />);

    boxes().forEach((input) => expect(input).toBeDisabled());
  });
});
