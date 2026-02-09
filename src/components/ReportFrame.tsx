'use client';

import { useState } from 'react';

interface ReportFrameProps {
  reportUrl: string;
  clientName: string;
}

export default function ReportFrame({ reportUrl, clientName }: ReportFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const openInNewTab = () => {
    window.open(reportUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex-1 relative bg-gray-100">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full spinner mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-yellow-400 rounded-full pulse-glow" />
              </div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Carregando relatório...</p>
            <p className="text-sm text-gray-400 mt-1">{clientName}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center max-w-md px-6">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Não foi possível carregar o relatório
            </h3>
            <p className="text-gray-500 mb-6">
              O relatório pode ter restrições de incorporação. Clique no botão abaixo para abrir em uma nova aba.
            </p>
            <button
              onClick={openInNewTab}
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-xl
                hover:bg-yellow-500 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Abrir Relatório
            </button>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={reportUrl}
        className="w-full h-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        title={`Relatório ${clientName}`}
        loading="lazy"
        allow="fullscreen"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
}
