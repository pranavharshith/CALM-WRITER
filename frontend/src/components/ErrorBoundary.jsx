import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error,
            errorInfo
        });

        // Log error to console in development
        console.error('Error caught by boundary:', error, errorInfo);

        // In production, you could send this to an error tracking service
        // e.g., Sentry, LogRocket, etc.
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="auth-container">
                    <div className="glass glass--strong" style={{
                        borderRadius: 'var(--radius-lg)',
                        padding: '3rem 2.5rem',
                        maxWidth: '500px',
                        width: '100%',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '1rem',
                            color: 'var(--amber)'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <h1 style={{
                            fontSize: '1.75rem',
                            fontWeight: '400',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-serif)',
                            margin: '0 0 1rem 0'
                        }}>
                            Something went wrong
                        </h1>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '1rem',
                            lineHeight: '1.6',
                            margin: '0 0 2rem 0'
                        }}>
                            We encountered an unexpected error. Please try refreshing the page or returning to the home page.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="glass" style={{
                                borderRadius: 'var(--radius-md)',
                                padding: '1rem',
                                marginBottom: '2rem',
                                textAlign: 'left'
                            }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    Error Details (Development Only)
                                </summary>
                                <pre style={{
                                    fontSize: '0.85rem',
                                    overflow: 'auto',
                                    margin: '0.5rem 0 0 0',
                                    color: 'var(--rose)'
                                }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                className="btn btn--primary"
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="btn btn--secondary"
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
