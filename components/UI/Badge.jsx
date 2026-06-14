'use client';
import { useApp } from '@/context/AppContext';

const STATUS_KEYS = {
  pending: 'st_pending', in_progress: 'st_in_progress', paused: 'st_paused',
  completed: 'st_completed', stopped: 'st_stopped', pending_approval: 'st_pending_approval',
};
const PRIORITY_KEYS = { high: 'pr_high', medium: 'pr_medium', low: 'pr_low' };
const ROLE_KEYS = { super_admin: 'r_super_admin', admin: 'r_admin', specialist: 'r_specialist' };

export function StatusBadge({ status }) {
  const { t } = useApp();
  return <span className={`badge b-${status}`}>{STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status}</span>;
}

export function PriorityBadge({ priority }) {
  const { t } = useApp();
  return <span className={`badge b-${priority}`}>{PRIORITY_KEYS[priority] ? t(PRIORITY_KEYS[priority]) : priority}</span>;
}

export function RoleBadge({ role }) {
  const { t } = useApp();
  return <span className={`badge b-${role}`}>{ROLE_KEYS[role] ? t(ROLE_KEYS[role]) : role}</span>;
}
