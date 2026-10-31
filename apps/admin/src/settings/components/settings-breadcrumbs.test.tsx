import SettingsBreadcrumbs from '@/settings/components/settings-breadcrumbs';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

describe('SettingsBreadcrumbs', () => {
  it('keeps its navigation buttons from submitting an enclosing form', () => {
    const handleBack = vi.fn();
    const handleSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    const { container } = render(
      <form onSubmit={handleSubmit}>
        <SettingsBreadcrumbs
          className="custom-class"
          current="Black Friday"
          label="Offers"
          onBack={handleBack}
        />
      </form>,
    );

    const back = screen.getByRole('button', { name: 'Back' });
    const ancestor = screen.getByRole('button', { name: 'Offers' });

    expect(back.getAttribute('type')).toBe('button');
    expect(back.classList.contains('md:hidden')).toBeTruthy();
    expect(ancestor.getAttribute('type')).toBe('button');
    expect(screen.getByText('Black Friday').getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('.custom-class')).toBeTruthy();

    fireEvent.click(back);
    fireEvent.click(ancestor);

    expect(handleBack.mock.calls.length).toBe(2);
    expect(handleSubmit.mock.calls.length).toBe(0);
  });
});
