import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/common/Tooltip';
import { AdminNavIcon } from '@/components/admin/AdminNavIcon';
import { ADMIN_NAV_GROUPS } from '@/config/adminNav';
import { hasAnyPermission, isStaffUser } from '@/utils/permissions';

function filterGroups(user) {
  if (!isStaffUser(user)) return [];
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.permissions) return true;
      return hasAnyPermission(user, item.permissions);
    }),
  })).filter((group) => group.items.length > 0);
}

/**
 * Grouped admin sidebar with expandable sections.
 * Collapsed mode shows icons + tooltips.
 */
export function AdminSidebar({ user, collapsed = false, onNavigate, className }) {
  const groups = useMemo(() => filterGroups(user), [user]);
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(ADMIN_NAV_GROUPS.map((group) => [group.id, true]))
  );

  useEffect(() => {
    // Keep newly visible groups expanded by default
    setOpenGroups((current) => {
      const next = { ...current };
      for (const group of groups) {
        if (next[group.id] === undefined) next[group.id] = true;
      }
      return next;
    });
  }, [groups]);

  function toggleGroup(id) {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <nav aria-label="Admin" className={cn('flex flex-col gap-3', className)}>
      {groups.map((group) => {
        const open = collapsed ? true : openGroups[group.id] !== false;

        return (
          <div key={group.id}>
            {!collapsed ? (
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="mb-1 flex w-full items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wide text-off-white/45 hover:text-off-white/70"
                aria-expanded={open}
              >
                <span>{group.label}</span>
                <span aria-hidden="true">{open ? '−' : '+'}</span>
              </button>
            ) : null}

            {open ? (
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const link = (
                    <NavLink
                      to={item.to}
                      end={Boolean(item.end)}
                      title={collapsed ? item.label : undefined}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-shield-red/90 text-white shadow-soft'
                            : 'text-off-white/75 hover:bg-graphite/70 hover:text-white'
                        )
                      }
                    >
                      <AdminNavIcon name={item.icon} />
                      {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      {collapsed ? <span className="sr-only">{item.label}</span> : null}
                    </NavLink>
                  );

                  return (
                    <li key={item.to}>
                      {collapsed ? <Tooltip content={item.label}>{link}</Tooltip> : link}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
