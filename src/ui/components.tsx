import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, font, personColors, radius, space } from './theme';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, style, small }: ButtonProps) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: v.fg }]}>
          {icon ? `${icon}  ` : ''}
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.brand, fg: '#fff', border: colors.brand },
  secondary: { bg: colors.surface, fg: colors.brand, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
};

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field(props: TextInputProps & { label?: string; prefix?: string }) {
  const { label, prefix, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.fieldWrap}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput placeholderTextColor={colors.inkFaint} style={[styles.field, style]} {...rest} />
      </View>
    </View>
  );
}

export function Avatar({ name, index, size = 32, dim }: { name: string; index: number; size?: number; dim?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: dim ? colors.line : personColors[index % personColors.length],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: dim ? colors.inkSoft : '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{initials || '?'}</Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color = colors.brand,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[styles.chip, active ? { backgroundColor: color, borderColor: color } : null]}
    >
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const STEPS = ['Snap', 'Check', 'People', 'Assign', 'Result'];

export function Stepper({ step }: { step: number }) {
  return (
    <View style={styles.stepper} accessibilityLabel={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
      {STEPS.map((s, i) => (
        <View key={s} style={{ flex: 1, gap: 6 }}>
          <View style={[styles.stepBar, i <= step && { backgroundColor: colors.brand }]} />
          <Text style={[styles.stepText, i === step && { color: colors.brand, fontWeight: '700' }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error'; children: React.ReactNode }) {
  const t = {
    info: { bg: colors.brandSoft, fg: colors.brand },
    warn: { bg: colors.accentSoft, fg: '#7A5200' },
    error: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 4, marginBottom: space(1) }}>
      <Text style={font.title}>{title}</Text>
      {subtitle ? <Text style={[font.small, { fontSize: 15, lineHeight: 21 }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: space(5),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: space(3), borderRadius: radius.sm },
  buttonText: { fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space(4),
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.inkSoft },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
  },
  prefix: { color: colors.inkSoft, fontSize: 15, marginRight: 4 },
  field: { flex: 1, minWidth: 0, width: '100%', minHeight: 46, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as never,
  chip: {
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  stepper: { flexDirection: 'row', gap: 6 },
  stepBar: { height: 4, borderRadius: 2, backgroundColor: colors.line },
  stepText: { fontSize: 11, color: colors.inkFaint, textAlign: 'center' },
  banner: { padding: space(3), borderRadius: radius.md },
});
