import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/helpers';
import { ReviewForm, type ReviewFormValues } from './ReviewForm';

const initialValues: ReviewFormValues = {
  brand: 'Prusament',
  materialName: 'Galaxy Black',
  materialType: 'PLA',
  finish: 'glitter',
  colorHex: '#26272f',
  netWeightG: 1000,
  filamentDiameterMm: 1.75,
  emptyContainerWeightG: 215,
  minNozzleTempC: 205,
  maxNozzleTempC: 225,
  bedTempC: 60,
  markFull: true,
};

describe('ReviewForm', () => {
  it('pre-fills every field from initialValues', () => {
    renderWithProviders(
      <ReviewForm
        initialValues={initialValues}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Prusament')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Galaxy Black')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.getByText(/Mark full — remaining = net weight \(1000 g\)/)).toBeInTheDocument();
    expect(screen.getByLabelText('Spool name')).toBeInTheDocument();
    expect(screen.getByLabelText('Color')).toHaveValue('#26272f');
    expect(screen.getByLabelText('Color hex code')).toHaveValue('#26272f');
  });

  it('pre-fills empty spool weight and submits an edited value', () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <ReviewForm
        initialValues={initialValues}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText('Empty spool weight (g)')).toHaveValue(215);

    fireEvent.change(screen.getByLabelText('Empty spool weight (g)'), {
      target: { value: '250' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to inventory' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ emptyContainerWeightG: 250 }));
  });

  it('updates the color when the hex text field is edited', () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <ReviewForm
        initialValues={initialValues}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Color hex code'), { target: { value: '#ff0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to inventory' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ colorHex: '#ff0000' }));
    expect(screen.getByLabelText('Color')).toHaveValue('#ff0000');
  });

  it('submits the edited values, not the original ones', () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <ReviewForm
        initialValues={initialValues}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('Galaxy Black'), {
      target: { value: 'Midnight Blue' },
    });
    fireEvent.change(screen.getByDisplayValue('1000'), { target: { value: '850' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to inventory' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ materialName: 'Midnight Blue', netWeightG: 850 }),
    );
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <ReviewForm
        initialValues={initialValues}
        isSubmitting={false}
        onCancel={onCancel}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables the submit button while submitting', () => {
    renderWithProviders(
      <ReviewForm
        initialValues={initialValues}
        isSubmitting
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Adding…' })).toBeDisabled();
  });
});
