import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

// Icons traced from the Veye design (Claude Design project).

export function BackIcon({ color = colors.ink, size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRight({ color = colors.placeholder, size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronDown({ color = colors.ink, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path d="M3 4.5 6 7.5l3-3" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PinIcon({ fill = colors.green, dot = '#fff', size = 32 }: { fill?: string; dot?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" fill={fill} />
      <Circle cx={12} cy={10} r={3.1} fill={dot} />
    </Svg>
  );
}

export function SendIcon({ color = '#fff', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11 21 3l-8 18-2-7-8-3Z" fill={color} />
    </Svg>
  );
}

export function CheckIcon({ color = colors.green, size = 42, strokeWidth = 3 }: { color?: string; size?: number; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4 10-11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PlusIcon({ color = '#fff', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function SearchIcon({ color = colors.faint, size = 19 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <Path d="m20 20-3.5-3.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function CrosshairIcon({ color = colors.greenDark, size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3.5} fill={color} />
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.8} />
      <Path d="M12 1v3M12 20v3M23 12h-3M4 12H1" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function TrashIcon({ color = '#C0392B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BatteryIcon({ color, fillWidth, width = 22, height = 12 }: { color: string; fillWidth: number; width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 12">
      <Rect x={1} y={1} width={20} height={10} rx={3} fill="none" stroke={color} strokeWidth={1.6} />
      <Rect x={3} y={3} width={fillWidth} height={6} rx={1.5} fill={color} />
      <Rect x={22} y={4} width={2} height={4} rx={1} fill={color} />
    </Svg>
  );
}

export function ScanFrameIcon({ color = colors.greenDark, size = 17 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"
        stroke={color} strokeWidth={2} strokeLinecap="round"
      />
    </Svg>
  );
}

// ---- Bottom nav icons ----

export function NavHomeIcon({ active }: { active: boolean }) {
  const A = colors.green, I = colors.faint;
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s6.5-5.5 6.5-11A6.5 6.5 0 1 0 5.5 10c0 5.5 6.5 11 6.5 11Z"
        fill={active ? A : 'none'} stroke={active ? A : I} strokeWidth={1.8} strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.4} fill={active ? '#fff' : 'transparent'} />
    </Svg>
  );
}

export function NavHistoryIcon({ active }: { active: boolean }) {
  const c = active ? colors.green : colors.faint;
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={c} strokeWidth={1.8} />
      <Path d="M12 7.5V12l3 2" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function NavZonesIcon({ active }: { active: boolean }) {
  const c = active ? colors.green : colors.faint;
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 5 6v5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z"
        fill={active ? '#D9EAD2' : 'none'} stroke={c} strokeWidth={1.8} strokeLinejoin="round"
      />
    </Svg>
  );
}

export function NavSettingsIcon({ active }: { active: boolean }) {
  const c = active ? colors.green : colors.faint;
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Path d="M5 8h11M19 8h0M8 16h11M5 16h0" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={9} cy={8} r={2.4} fill="#fff" stroke={c} strokeWidth={1.8} />
      <Circle cx={15} cy={16} r={2.4} fill="#fff" stroke={c} strokeWidth={1.8} />
    </Svg>
  );
}
