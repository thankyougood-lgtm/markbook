import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Dict } from '../i18n';
import type { AnalyticsResult } from './stats';
import type { Theme } from '../state/preferences';

interface Props { result: AnalyticsResult; tr: Dict; theme: Theme }

export default function Charts({ result, tr, theme }: Props) {
  const a = tr.analytics;
  const attendanceLabels = { P: tr.attendance.present, A: tr.attendance.absent, L: tr.attendance.late, E: tr.attendance.excused };
  // Chart SVG uses the same theme tokens as the rest of the app. Reading the
  // variables after a theme change keeps Recharts colors in sync.
  void theme;
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const colors = {
    accent: token('--accent'), muted: token('--muted'), line: token('--line'),
    surface: token('--surface'), navy: token('--navy'), danger: token('--danger'),
    warning: token('--warning'), success: token('--success')
  };
  const statusColors = { P: colors.success, A: colors.danger, L: colors.warning, E: colors.accent };
  const tooltipStyle = { background: colors.surface, border: `1px solid ${colors.line}`, borderRadius: 12, color: colors.navy, fontSize: 12 };
  const axis = { fill: colors.muted, fontSize: 11 };
  const barData = result.subjects.filter((s) => s.average !== null);
  const statusData = result.statuses.map((s) => ({ ...s, name: attendanceLabels[s.status] }));
  const initial = { width: 320, height: 200 };

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <section className="min-w-0 rounded-card bg-surface p-4 shadow-soft" aria-label={a.subjectScores}>
        <h2 className="text-sm font-semibold text-navy">{a.subjectScores}</h2>
        <p className="mt-1 text-xs text-muted">{a.averageExplanation}</p>
        <div className="mt-3 h-[230px] min-w-0" data-testid="subject-chart">
          {barData.length ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={initial}>
              <BarChart data={barData} margin={{ top: 12, right: 8, bottom: 4, left: -18 }} accessibilityLayer>
                <CartesianGrid stroke={colors.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => v.length > 10 ? `${v.slice(0, 9)}…` : v} />
                <YAxis tick={axis} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [String(value), a.classAverage]} />
                <Bar dataKey="average" fill={colors.accent} radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart text={a.noScores} />}
        </div>
        {barData.length > 0 && <p className="mt-2 break-words text-xs text-muted">{barData.map((s) => `${s.name}: ${s.average}/${s.maxScore}`).join(' · ')}</p>}
      </section>

      <section className="min-w-0 rounded-card bg-surface p-4 shadow-soft" aria-label={a.attendanceCounts}>
        <h2 className="text-sm font-semibold text-navy">{a.attendanceCounts}</h2>
        <p className="mt-1 text-xs text-muted">{a.recordsExplanation}</p>
        <div className="mt-3 h-[230px] min-w-0" data-testid="status-chart">
          {result.recordedAttendance || result.statuses.some((s) => s.status === 'E' && s.count) ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={initial}>
              <BarChart data={statusData} layout="vertical" margin={{ top: 8, right: 20, bottom: 4, left: 4 }} accessibilityLayer>
                <CartesianGrid stroke={colors.line} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={78} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [String(value), a.records]} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28} isAnimationActive={false}>
                  {statusData.map((entry) => <Cell key={entry.status} fill={statusColors[entry.status]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart text={a.noAttendance} />}
        </div>
        <p className="mt-2 text-xs text-muted">{statusData.map((s) => `${s.name}: ${s.count}`).join(' · ')}</p>
      </section>

      <section className="min-w-0 rounded-card bg-surface p-4 shadow-soft lg:col-span-2" aria-label={a.attendanceTrend}>
        <h2 className="text-sm font-semibold text-navy">{a.attendanceTrend}</h2>
        <p className="mt-1 text-xs text-muted">{a.attendanceRule}</p>
        <div className="mt-3 h-[240px] min-w-0" data-testid="trend-chart">
          {result.trend.length ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 210 }}>
              <LineChart data={result.trend} margin={{ top: 12, right: 16, bottom: 4, left: -16 }} accessibilityLayer>
                <CartesianGrid stroke={colors.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={axis} tickLine={false} axisLine={false} minTickGap={28} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, a.attendanceRate]} />
                <Line type="monotone" dataKey="percent" stroke={colors.accent} strokeWidth={3} dot={{ r: 4, fill: colors.accent }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart text={a.noAttendance} />}
        </div>
        {result.trend.length > 0 && <p className="mt-2 break-words text-xs text-muted">{result.trend.map((d) => `${d.date}: ${d.percent === null ? '–' : `${d.percent}%`}`).join(' · ')}</p>}
      </section>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center rounded-btn border border-dashed border-line bg-header-bg/30 px-6 text-center text-sm text-muted">{text}</div>;
}
