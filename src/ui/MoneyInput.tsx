import React, { useEffect, useState } from 'react';
import { Field } from './components';
import { centsToInput, parseCents } from '../lib/money';
import type { StyleProp, TextStyle } from 'react-native';

/**
 * Text field for money. Keeps the raw text while typing (so "12." is allowed)
 * and reports integer cents whenever the text is a valid amount.
 */
export function MoneyInput({
  cents,
  onChange,
  label,
  prefix = '$',
  placeholder = '0.00',
  style,
  accessibilityLabel,
}: {
  cents: number;
  onChange: (cents: number) => void;
  label?: string;
  prefix?: string;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}) {
  const [text, setText] = useState(cents ? centsToInput(cents) : '');
  const [invalid, setInvalid] = useState(false);

  // Sync when the value changes from outside (e.g. a new receipt was loaded).
  useEffect(() => {
    const parsed = parseCents(text);
    if (parsed !== cents && !(text === '' && cents === 0)) setText(cents ? centsToInput(cents) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents]);

  return (
    <Field
      label={label}
      prefix={prefix}
      value={text}
      placeholder={placeholder}
      keyboardType="decimal-pad"
      inputMode="decimal"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[{ textAlign: 'right', fontVariant: ['tabular-nums'] }, invalid && { color: '#C2410C' }, style]}
      onChangeText={(t) => {
        setText(t);
        const parsed = t.trim() === '' ? 0 : parseCents(t);
        setInvalid(parsed === null);
        if (parsed !== null) onChange(parsed);
      }}
      onBlur={() => {
        const parsed = parseCents(text);
        if (parsed !== null) setText(parsed ? centsToInput(parsed) : '');
      }}
    />
  );
}
