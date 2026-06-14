'use client';
import { useApp } from '@/context/AppContext';

const STATUS_KEYS = {
  pending: 'st_pending',
  in_progress: 'st_in_progress',
  paused: 'st_paused',
  completed: 'st_completed',
  stopped: 'st_stopped',
  pending_approval: 'st_pending_approval',
};

const PRIORITY_KEYS = {
  high: 'pr_high',
  medium: 'pr_medium',
  low: 'pr_low',
};

export function StatusBadge({ status }) {
  const { t } = useApp();
  const label = STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status;
  return <span className={`badge b-${status}`}>{label}</span>;
}

export function PriorityBadge({ priority }) {
  const { t } = useApp();
  const label = PRIORITY_KEYS[priority] ? t(PRIORITY_KEYS[priority]) : priority;
  return <span className={`badge b-${priority}`}>{label}</span>;
}

export function RoleBadge({ role }) {
  const { t } = useApp();
  const keys = { super_admin: 'r_super_admin', admin: 'r_admin', specialist: 'r_specialist' };
  return <span className={`rtag r-${role}`}>{keys[role] ? t(keys[role]) : role}</span>;
}
