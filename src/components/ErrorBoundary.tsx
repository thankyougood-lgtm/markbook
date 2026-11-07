import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo): void { console.error('Page crashed', error, info.componentStack); }
  render(): ReactNode {
    if (this.state.error) {
      const tr = t();
      return <div className="px-4 pt-6"><section className="rounded-card border border-danger bg-surface p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-danger">{tr.errors.title}</h2>
        <p className="mt-2 break-words text-xs text-navy">{this.state.error.message}</p>
        <button type="button" onClick={() => this.setState({ error: null })} className="mt-4 min-h-[44px] rounded-btn bg-accent px-4 py-2 text-xs font-semibold text-surface">{tr.errors.retry}</button>
      </section></div>;
    }
    return this.props.children;
  }
}
