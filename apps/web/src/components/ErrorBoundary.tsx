import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white p-8">
                    <div className="max-w-2xl w-full bg-zinc-800 rounded-lg p-6 border border-red-500/30">
                        <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
                        <p className="mb-4 text-zinc-300">The application crashed. Please share this error with the developer:</p>

                        <div className="bg-black/50 p-4 rounded overflow-auto mb-6 max-h-[300px]">
                            <p className="font-mono text-red-400 font-bold mb-2">{this.state.error?.toString()}</p>
                            <pre className="font-mono text-xs text-zinc-500 whitespace-pre-wrap">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
