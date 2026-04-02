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
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fefefd',
                    fontFamily: 'Georgia, serif',
                    padding: '2rem'
                }}>
                    <div style={{
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '3rem 2.5rem',
                        maxWidth: '500px',
                        width: '100%',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😔</div>
                        <h1 style={{
                            fontSize: '1.75rem',
                            fontWeight: '400',
                            color: '#222',
                            margin: '0 0 1rem 0'
                        }}>
                            Something went wrong
                        </h1>
                        <p style={{
                            color: '#666',
                            fontSize: '1rem',
                            lineHeight: '1.6',
                            margin: '0 0 2rem 0'
                        }}>
                            We encountered an unexpected error. Please try refreshing the page or returning to the home page.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={{
                                background: '#f8f9fa',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
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
                                    color: '#c7968c'
                                }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '0.875rem 1.5rem',
                                    background: '#3d5a80',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '1rem',
                                    fontFamily: 'Georgia, serif',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    padding: '0.875rem 1.5rem',
                                    background: 'white',
                                    color: '#3d5a80',
                                    border: '1px solid #3d5a80',
                                    borderRadius: '4px',
                                    fontSize: '1rem',
                                    fontFamily: 'Georgia, serif',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
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
