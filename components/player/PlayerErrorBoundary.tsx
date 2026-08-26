'use client';

import React, { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PlayerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PlayerErrorBoundary] Error caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 text-center gap-3 max-w-sm mx-auto my-8">
          <AlertCircle size={32} className="text-zinc-500" />
          <h3 className="text-sm font-medium text-white">Playback Component Error</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            An unexpected error occurred in the player. You can retry loading or switch playback engine in settings.
          </p>
          <button
            onClick={this.handleReset}
            aria-label="Retry loading player"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-black text-xs font-medium hover:bg-zinc-200 transition-colors mt-2"
          >
            <RefreshCw size={12} />
            Retry Player
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
