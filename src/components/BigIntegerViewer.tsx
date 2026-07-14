/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';

interface BigIntegerViewerProps {
  value: string | bigint | number;
  label: string;
  isHex?: boolean;
  truncateAt?: number;
}

export function BigIntegerViewer({ value, label, isHex = false, truncateAt = 64 }: BigIntegerViewerProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const valStr = typeof value === 'bigint' ? value.toString() : String(value);
  if (!valStr || valStr.trim() === '') return null;

  const isLong = valStr.length > truncateAt;
  const displayStr = isLong && !expanded 
    ? `${valStr.substring(0, truncateAt / 2)}...${valStr.substring(valStr.length - truncateAt / 2)}` 
    : valStr;

  const handleCopy = () => {
    navigator.clipboard.writeText(valStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let bitCount = 0;
  if (typeof value === 'bigint') {
    bitCount = value.toString(2).length;
  } else if (typeof value === 'number') {
    bitCount = Math.floor(value).toString(2).length;
  } else {
    try {
      const cleaned = valStr.trim();
      if (/^[0-9]+$/.test(cleaned)) {
        bitCount = BigInt(cleaned).toString(2).length;
      } else if (/^(0x)?[0-9a-fA-F]+$/.test(cleaned)) {
        const hexVal = cleaned.startsWith('0x') ? cleaned : '0x' + cleaned;
        bitCount = BigInt(hexVal).toString(2).length;
      }
    } catch (e) {
      bitCount = 0;
    }
  }

  return (
    <div className="bg-white border-2 border-[#141414] p-3 text-xs font-mono relative transition-all shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]">
      <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#141414]/20">
        <span className="text-[#141414] font-bold text-xs tracking-tight">{label}</span>
        <div className="flex items-center gap-2">
          {bitCount > 0 && (
            <span className="bg-[#141414] text-[#E4E3E0] text-[9px] px-1.5 py-0.5 font-bold uppercase">
              {bitCount} bits {isHex ? '(Hex)' : '(Dec)'}
            </span>
          )}
          <button 
            onClick={handleCopy} 
            className="text-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] border border-[#141414] p-1 transition-colors"
            title="Copier la valeur"
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          </button>
          {isLong && (
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="text-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] border border-[#141414] p-1 transition-colors"
              title={expanded ? "Réduire" : "Afficher en entier"}
            >
              {expanded ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          )}
        </div>
      </div>
      <div className="text-[#141414] break-all select-all leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto pr-1 bg-[#E4E3E0]/50 p-2 border border-[#141414]/10 font-mono text-[11px]">
        {displayStr}
      </div>
    </div>
  );
}
