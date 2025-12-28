import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg text-center shadow-2xl border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              The application encountered an unexpected error. Your data is likely safe. Please reload to continue.
            </p>

            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-left mb-6 overflow-hidden">
              <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words font-bold">
                {this.state.error?.message || 'Unknown Error'}
              </p>

              {this.state.showDetails && this.state.errorInfo && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-slide-down">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Stack Trace:</p>
                  <pre className="text-[10px] font-mono text-slate-500 dark:text-slate-400 overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={this.handleReload} className="w-full justify-center">
                <RefreshCw size={18} className="mr-2" /> Reload Application
              </Button>
              {this.state.errorInfo && (
                <button
                  onClick={this.toggleDetails}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                >
                  {this.state.showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
                </button>
              )}
            </div>
          </Card>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
