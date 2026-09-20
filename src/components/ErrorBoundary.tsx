import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Here you could log to an error tracking service
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Ada Kesalahan</h2>
            <p className="text-gray-600 mb-4">
              Maaf, terjadi kesalahan pada aplikasi.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
      return FallbackComponent;
    }

    return this.props.children;
  }
}

// React.memo version for cleaner usage
const ErrorBoundaryMemo = React.memo(ErrorBoundary);
type ErrorBoundaryProps = React.ComponentProps<typeof ErrorBoundaryMemo>;

export const SafeApplication: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundaryMemo fallback={
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Aplikasi Mengalami Kesalahan</h2>
          <p className="text-gray-600 mb-4">
            Mohon hubungi administrator sistem jika masalah berlanjut.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    }>
      {children}
    </ErrorBoundaryMemo>
  );
};
