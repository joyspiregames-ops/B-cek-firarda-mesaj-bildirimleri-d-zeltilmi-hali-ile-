import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  error: Error | null;
}

class RootErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Root render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-dvh w-screen items-center justify-center bg-[#081513] p-6 text-center text-white">
          <div className="max-w-sm rounded-2xl border-2 border-rose-400/80 bg-slate-950 p-5 shadow-2xl">
            <h1 className="text-lg font-extrabold text-rose-300">
              Ekran Yükleme Hatası
            </h1>
            <p className="mt-2 text-xs text-slate-300 break-words">
              {this.state.error.message || 'Beklenmeyen bir hata oluştu.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-extrabold text-slate-950"
            >
              Yeniden Yükle
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
