'use client';

import { Component, Suspense, ReactNode } from 'react';

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      '[Konitys Federation] Render error in federated component:',
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

interface FederatedWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingPlaceholder?: ReactNode;
}

export default function FederatedWrapper({
  children,
  fallback,
  loadingPlaceholder,
}: FederatedWrapperProps) {
  const loading = loadingPlaceholder || fallback || null;

  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={loading}>{children}</Suspense>
    </ErrorBoundary>
  );
}
