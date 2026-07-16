// Veye design tokens — extracted from the Claude Design project "Veye Parent App"
export const colors = {
  bg: '#FBF7EF',
  surface: '#FFFFFF',
  ink: '#232220',
  inkSoft: '#4A463F',
  muted: '#6E6A62',
  faint: '#9A958B',
  placeholder: '#C8C2B6',
  border: '#ECE6DA',
  divider: '#F2EEE4',
  track: '#D8D2C6',
  skeleton: '#ECE6DA',
  line: '#E3DECF',

  green: '#1B8A5E',
  greenDark: '#14704C',
  greenSoft: '#E4F0E8',
  amber: '#D97706',
  amberInk: '#9A6A12',
  amberSoft: '#FBEBD2',
  red: '#D6503F',
  redInk: '#B23A2C',
  redSoft: '#FBE3E0',
  redBorder: '#F0CFC9',
  grey: '#A9A399',
  blue: '#2A7DE1',
} as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayExtra: 'BricolageGrotesque_800ExtraBold',
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
  extrabold: 'HankenGrotesk_800ExtraBold',
} as const;

export const radius = { sm: 12, md: 14, lg: 16, xl: 18, xxl: 24 } as const;

export type ChildStatus = 'safe' | 'lost' | 'off';

export const statusColors: Record<
  ChildStatus,
  { pillBg: string; pillColor: string; ring: string }
> = {
  safe: { pillBg: colors.greenSoft, pillColor: colors.greenDark, ring: colors.green },
  lost: { pillBg: colors.amberSoft, pillColor: colors.amberInk, ring: colors.grey },
  off: { pillBg: colors.redSoft, pillColor: colors.redInk, ring: colors.red },
};

export const avatarPalette = [
  { color: '#F0C9A8', ink: '#A65A30' },
  { color: '#BFD8C4', ink: '#2E6B4C' },
  { color: '#E7CBE0', ink: '#8A4F86' },
  { color: '#C9D8F0', ink: '#3A5A8A' },
  { color: '#F0E4A8', ink: '#8A7430' },
] as const;

export function batteryColor(battery: number, status: ChildStatus): string {
  if (status === 'off' || battery === 0) return colors.red;
  if (battery < 25) return colors.amber;
  return colors.green;
}
