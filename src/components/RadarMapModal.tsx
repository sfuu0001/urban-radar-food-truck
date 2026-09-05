import React from 'react';
import { OrderTrackingView } from './OrderTrackingView';
import { TruckInfo } from '../types';

interface RadarMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck?: TruckInfo;
  orderId?: string;
  deliveryAddress?: string;
}

export const RadarMapModal: React.FC<RadarMapModalProps> = ({
  isOpen,
  onClose,
  truck,
  orderId = '#DEL-9912',
  deliveryAddress
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#f4f4f2] rounded-2xl shadow-2xl overflow-y-auto hide-scrollbar">
        <OrderTrackingView
          orderId={orderId}
          truck={truck}
          deliveryAddress={deliveryAddress}
          onBackToMenu={onClose}
        />
      </div>
    </div>
  );
};


