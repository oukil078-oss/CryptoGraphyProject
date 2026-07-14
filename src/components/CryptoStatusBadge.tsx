/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, ShieldAlert, User, Clock, Lock, CheckCircle2 } from 'lucide-react';
import { ElectionStatus, UserRole } from '../types';

interface CryptoStatusBadgeProps {
  type: 'security' | 'role' | 'election';
  value: boolean | UserRole | ElectionStatus;
}

export function CryptoStatusBadge({ type, value }: CryptoStatusBadgeProps) {
  if (type === 'security') {
    const isPedagogic = value as boolean;
    return isPedagogic ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-[#141414] text-xs font-bold bg-[#F27D26] text-[#141414] uppercase shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]">
        <ShieldAlert size={14} />
        MODE DEMO (CLES FAIBLES)
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-[#141414] text-xs font-bold bg-[#141414] text-[#E4E3E0] uppercase shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]">
        <ShieldCheck size={14} />
        MODE CRYPTO FORTE (SECURISE)
      </span>
    );
  }

  if (type === 'role') {
    const role = value as UserRole;
    let style = "bg-white text-[#141414] border-[#141414]";
    let icon = <User size={12} />;
    
    if (role === UserRole.ADMIN) {
      style = "bg-[#F27D26]/20 text-[#141414] border-[#141414] font-bold";
    } else if (role === UserRole.VOTER) {
      style = "bg-emerald-100 text-[#141414] border-[#141414] font-bold";
    } else if (role === UserRole.AUDITOR) {
      style = "bg-blue-100 text-[#141414] border-[#141414] font-bold";
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 border-2 text-[10px] uppercase font-bold tracking-wider ${style}`}>
        {icon}
        {role}
      </span>
    );
  }

  if (type === 'election') {
    const status = value as ElectionStatus;
    let label = 'Brouillon';
    let style = 'bg-white text-[#141414] border-[#141414]';
    let icon = <Clock size={12} />;

    if (status === ElectionStatus.OPEN) {
      label = 'SCRUTIN OUVERT';
      style = 'bg-emerald-400 text-[#141414] border-[#141414] font-black shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]';
      icon = <CheckCircle2 size={12} />;
    } else if (status === ElectionStatus.CLOSED) {
      label = 'SCRUTIN CLÔTURÉ';
      style = 'bg-[#F27D26] text-[#141414] border-[#141414] font-black shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]';
      icon = <Lock size={12} />;
    } else if (status === ElectionStatus.TALLIED) {
      label = 'DEPOUILLE & VERIFIE';
      style = 'bg-[#141414] text-[#E4E3E0] border-[#141414] font-black shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]';
      icon = <ShieldCheck size={12} />;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 border-2 text-[10px] font-bold uppercase ${style}`}>
        {icon}
        {label}
      </span>
    );
  }

  return null;
}
