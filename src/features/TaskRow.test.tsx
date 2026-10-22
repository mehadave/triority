import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LazyMotion, domMax } from 'motion/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskRow } from './TaskRow';

function renderRow(done: boolean, onToggle = vi.fn()) {
  render(
    <LazyMotion features={domMax}>
      <ul>
        <TaskRow
          task={{ text: 'Write the intro', done, doneAt: null }}
          index={0}
          editable
          onToggle={onToggle}
          onEdit={vi.fn()}
        />
      </ul>
    </LazyMotion>,
  );
  return onToggle;
}

describe('TaskRow', () => {
  it('is a real checkbox with its state exposed', () => {
    renderRow(true);
    const box = screen.getByRole('checkbox', { name: 'Write the intro' });
    expect(box).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles with Space and Enter', async () => {
    const user = userEvent.setup();
    const onToggle = renderRow(false);
    screen.getByRole('checkbox').focus();
    await user.keyboard(' ');
    await user.keyboard('{Enter}');
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('offers an edit button for today', () => {
    renderRow(false);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });
});
