import React from 'react';

interface LogoProps {
  className?: string;
  textClassName?: string;
}

export default function Logo({ className = '', textClassName = '' }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className={`font-bold text-2xl ${textClassName}`}>
        <span className="text-secondary">Maple</span> <span className="text-primary">Capital Advisors</span>
      </div>
    </div>
  );
}