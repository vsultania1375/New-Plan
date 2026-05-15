import React from 'react';
import { ArrowLeft, ChevronRight, Map } from 'lucide-react';

export function MapBreadcrumb({ selectedState, selectedPop, onBack, onBackToState }) {
  return (
    <div className="map-breadcrumb">
      <div>
        <Map size={15} />
        <span>PAN India</span>
        {selectedState && (
          <>
            <ChevronRight size={14} />
            {selectedPop ? (
              <button className="breadcrumb-link" type="button" onClick={onBackToState}>
                {selectedState}
              </button>
            ) : (
              <strong>{selectedState}</strong>
            )}
          </>
        )}
        {selectedPop && (
          <>
            <ChevronRight size={14} />
            <strong>{selectedPop}</strong>
          </>
        )}
      </div>
      {selectedState && (
        <button className="secondary-button map-back-button" type="button" onClick={onBack}>
          <ArrowLeft size={15} /> Back to PAN India
        </button>
      )}
    </div>
  );
}
