import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { HandCircle, PencilIcon, Tick } from '../components/art';
import type { Task } from '../domain/types';
import { TASK_MAX } from '../domain/types';

interface TaskRowProps {
  task: Task;
  index: number;
  editable: boolean;
  onToggle?: () => void;
  onEdit?: (text: string) => Promise<void>;
}

export function TaskRow({ task, index, editable, onToggle, onEdit }: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // Only animate ticks the user makes, not ones that were already there on load.
  const [touched, setTouched] = useState(false);
  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  const startEdit = () => {
    setDraft(task.text);
    setError(null);
    setEditing(true);
  };

  const canEdit = editable && Boolean(onEdit);

  // Hold for half a second to edit; the tap that follows is swallowed so it doesn't tick.
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
  };
  const onPointerDown = (e: PointerEvent) => {
    if (!canEdit || e.button !== 0) return;
    cancelPress();
    const state = { x: e.clientX, y: e.clientY, fired: false, timer: 0 };
    state.timer = window.setTimeout(() => {
      state.fired = true;
      navigator.vibrate?.(15);
      startEdit();
    }, 500);
    press.current = state;
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancelPress();
  };

  useEffect(() => cancelPress, []);

  const save = async () => {
    if (draft.trim() === task.text) return setEditing(false);
    try {
      await onEdit?.(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void save();
    if (e.key === 'Escape') {
      e.stopPropagation();
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <li className="flex min-h-14 items-center gap-3">
        <span className="shrink-0 opacity-40">
          <HandCircle variant={index} />
        </span>
        <div className="flex-1">
          <label className="sr-only" htmlFor={`task-edit-${index}`}>
            Edit priority {index + 1}
          </label>
          <input
            id={`task-edit-${index}`}
            ref={input}
            className="ink-input text-task"
            value={draft}
            maxLength={TASK_MAX}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => void save()}
          />
          {error && (
            <p role="alert" className="mt-1 text-[13px]">
              {error}
            </p>
          )}
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-disabled={!onToggle || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(e) => canEdit && e.preventDefault()}
        onClick={() => {
          if (press.current?.fired) {
            press.current = null;
            return;
          }
          if (!onToggle) return;
          setTouched(true);
          onToggle();
        }}
        className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl py-1 pr-2 text-left"
      >
        <span className="relative h-[46px] w-[46px] shrink-0">
          <HandCircle variant={index} />
          {task.done && <Tick animate={touched} />}
        </span>
        <span className="text-task leading-snug break-words">
          <span
            className={`strike transition-colors duration-300 ${task.done ? 'text-muted-ink' : 'text-ink'}`}
            data-on={task.done}
            data-instant={!touched}
          >
            {task.text}
          </span>
        </span>
      </button>
      {canEdit && (
        <button
          type="button"
          onClick={startEdit}
          className="text-muted-ink flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          aria-label={`Edit “${task.text}”`}
        >
          <PencilIcon />
        </button>
      )}
    </li>
  );
}
