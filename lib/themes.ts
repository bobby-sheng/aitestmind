export interface ThemeConfig {
  id: string
  name: string
  colorScheme: 'light' | 'dark'
  variables: {
    // Layout & Typography
    fontSans?: string
    fontSerif?: string
    fontMono?: string
    radius?: string
    
    // Shadows
    shadowOpacity?: string
    shadowBlur?: string
    shadowSpread?: string
    shadowOffsetX?: string
    shadowOffsetY?: string
    
    // Spacing & Typography
    letterSpacing?: string
    spacing?: string
    
    // Colors
    background: string
    foreground: string
    card?: string
    cardForeground?: string
    popover?: string
    popoverForeground?: string
    primary: string
    primaryForeground: string
    secondary?: string
    secondaryForeground?: string
    muted?: string
    mutedForeground?: string
    accent?: string
    accentForeground?: string
    destructive?: string
    destructiveForeground?: string
    border?: string
    input?: string
    ring?: string
    
    // Charts
    chart1?: string
    chart2?: string
    chart3?: string
    chart4?: string
    chart5?: string
    
    // Sidebar
    sidebar?: string
    sidebarForeground?: string
    sidebarPrimary?: string
    sidebarPrimaryForeground?: string
    sidebarAccent?: string
    sidebarAccentForeground?: string
    sidebarBorder?: string
    sidebarRing?: string
  }
}

export const themes: ThemeConfig[] = [
  {
    id: 'default',
    name: 'Default',
    colorScheme: 'light',
    variables: {
      radius: '0.65rem',
      shadowOpacity: '0.1',
      shadowBlur: '3px',
      shadowSpread: '0px',
      shadowOffsetX: '0',
      shadowOffsetY: '1px',
      letterSpacing: '0em',
      spacing: '0.25rem',
      background: 'hsl(300 50% 100%)',
      foreground: 'hsl(240.1022 11.2443% 3.9839%)',
      card: 'hsl(300 50% 100%)',
      cardForeground: 'hsl(240.1022 11.2443% 3.9839%)',
      popover: 'hsl(300 50% 100%)',
      popoverForeground: 'hsl(240.1022 11.2443% 3.9839%)',
      primary: 'hsl(216.8916 105.653% 59.6083%)',
      primaryForeground: 'hsl(213.7504 96.4849% 96.7906%)',
      secondary: 'hsl(239.9923 3.51% 95.7864%)',
      secondaryForeground: 'hsl(240.0173 6.0307% 9.9812%)',
      muted: 'hsl(239.9923 3.51% 95.7864%)',
      mutedForeground: 'hsl(240.0969 4.4107% 46.3367%)',
      accent: 'hsl(239.9923 3.51% 95.7864%)',
      accentForeground: 'hsl(240.0173 6.0307% 9.9812%)',
      destructive: 'hsl(351.7303 123.6748% 40.5257%)',
      destructiveForeground: 'hsl(300 50% 100%)',
      border: 'hsl(239.999 5.8553% 90.0314%)',
      input: 'hsl(239.999 5.8553% 90.0314%)',
      ring: 'hsl(216.8916 105.653% 59.6083%)',
      sidebar: 'hsl(300 0% 98.0256%)',
      sidebarForeground: 'hsl(240.1022 11.2443% 3.9839%)',
      sidebarPrimary: 'hsl(216.8916 105.653% 59.6083%)',
      sidebarPrimaryForeground: 'hsl(213.7504 96.4849% 96.7906%)',
      sidebarAccent: 'hsl(239.9923 3.51% 95.7864%)',
      sidebarAccentForeground: 'hsl(240.0173 6.0307% 9.9812%)',
      sidebarBorder: 'hsl(239.999 5.8553% 90.0314%)',
      sidebarRing: 'hsl(216.8916 105.653% 59.6083%)',
    }
  },
  {
    id: 'amber-minimal',
    name: 'Amber Minimal',
    colorScheme: 'light',
    variables: {
      radius: '0.5rem',
      background: 'hsl(0 0% 100%)',
      foreground: 'hsl(20 14.3% 4.1%)',
      card: 'hsl(0 0% 100%)',
      cardForeground: 'hsl(20 14.3% 4.1%)',
      popover: 'hsl(0 0% 100%)',
      popoverForeground: 'hsl(20 14.3% 4.1%)',
      primary: 'hsl(38 92% 50%)',
      primaryForeground: 'hsl(48 96% 89%)',
      secondary: 'hsl(40 35% 95%)',
      secondaryForeground: 'hsl(30 10% 15%)',
      muted: 'hsl(40 35% 95%)',
      mutedForeground: 'hsl(25 5.3% 44.7%)',
      accent: 'hsl(40 35% 95%)',
      accentForeground: 'hsl(24 9.8% 10%)',
      destructive: 'hsl(0 84.2% 60.2%)',
      destructiveForeground: 'hsl(60 9.1% 97.8%)',
      border: 'hsl(20 5.9% 90%)',
      input: 'hsl(20 5.9% 90%)',
      ring: 'hsl(38 92% 50%)',
    }
  },
  {
    id: 'amethyst-haze',
    name: 'Amethyst Haze',
    colorScheme: 'light',
    variables: {
      radius: '0.75rem',
      background: 'hsl(270 20% 98%)',
      foreground: 'hsl(270 15% 10%)',
      card: 'hsl(270 20% 98%)',
      cardForeground: 'hsl(270 15% 10%)',
      popover: 'hsl(270 50% 100%)',
      popoverForeground: 'hsl(270 15% 10%)',
      primary: 'hsl(270 65% 55%)',
      primaryForeground: 'hsl(270 100% 98%)',
      secondary: 'hsl(270 20% 92%)',
      secondaryForeground: 'hsl(270 15% 20%)',
      muted: 'hsl(270 20% 92%)',
      mutedForeground: 'hsl(270 10% 45%)',
      accent: 'hsl(280 60% 92%)',
      accentForeground: 'hsl(270 15% 20%)',
      destructive: 'hsl(0 72% 51%)',
      destructiveForeground: 'hsl(0 0% 98%)',
      border: 'hsl(270 15% 88%)',
      input: 'hsl(270 15% 88%)',
      ring: 'hsl(270 65% 55%)',
    }
  },
  {
    id: 'bold-tech',
    name: 'Bold Tech',
    colorScheme: 'dark',
    variables: {
      radius: '0.25rem',
      background: 'hsl(220 15% 8%)',
      foreground: 'hsl(0 0% 98%)',
      card: 'hsl(220 15% 12%)',
      cardForeground: 'hsl(0 0% 98%)',
      popover: 'hsl(220 15% 12%)',
      popoverForeground: 'hsl(0 0% 98%)',
      primary: 'hsl(180 100% 50%)',
      primaryForeground: 'hsl(220 15% 8%)',
      secondary: 'hsl(220 15% 18%)',
      secondaryForeground: 'hsl(0 0% 95%)',
      muted: 'hsl(220 15% 18%)',
      mutedForeground: 'hsl(0 0% 65%)',
      accent: 'hsl(280 100% 60%)',
      accentForeground: 'hsl(0 0% 98%)',
      destructive: 'hsl(0 100% 60%)',
      destructiveForeground: 'hsl(0 0% 98%)',
      border: 'hsl(220 15% 22%)',
      input: 'hsl(220 15% 22%)',
      ring: 'hsl(180 100% 50%)',
    }
  },
  {
    id: 'bubblegum',
    name: 'Bubblegum',
    colorScheme: 'light',
    variables: {
      radius: '1rem',
      background: 'hsl(330 100% 98%)',
      foreground: 'hsl(330 20% 15%)',
      card: 'hsl(330 100% 98%)',
      cardForeground: 'hsl(330 20% 15%)',
      popover: 'hsl(330 100% 100%)',
      popoverForeground: 'hsl(330 20% 15%)',
      primary: 'hsl(330 85% 60%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(320 40% 92%)',
      secondaryForeground: 'hsl(330 20% 20%)',
      muted: 'hsl(320 40% 92%)',
      mutedForeground: 'hsl(330 10% 50%)',
      accent: 'hsl(340 75% 90%)',
      accentForeground: 'hsl(330 20% 20%)',
      destructive: 'hsl(0 75% 55%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(330 30% 90%)',
      input: 'hsl(330 30% 90%)',
      ring: 'hsl(330 85% 60%)',
    }
  },
  {
    id: 'caffeine',
    name: 'Caffeine',
    colorScheme: 'light',
    variables: {
      radius: '0.5rem',
      background: 'hsl(30 30% 97%)',
      foreground: 'hsl(25 20% 10%)',
      card: 'hsl(30 30% 97%)',
      cardForeground: 'hsl(25 20% 10%)',
      popover: 'hsl(30 40% 100%)',
      popoverForeground: 'hsl(25 20% 10%)',
      primary: 'hsl(25 65% 40%)',
      primaryForeground: 'hsl(30 100% 98%)',
      secondary: 'hsl(30 25% 88%)',
      secondaryForeground: 'hsl(25 20% 20%)',
      muted: 'hsl(30 25% 88%)',
      mutedForeground: 'hsl(25 10% 45%)',
      accent: 'hsl(20 70% 90%)',
      accentForeground: 'hsl(25 20% 20%)',
      destructive: 'hsl(0 70% 50%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(30 20% 85%)',
      input: 'hsl(30 20% 85%)',
      ring: 'hsl(25 65% 40%)',
    }
  },
  {
    id: 'candyland',
    name: 'Candyland',
    colorScheme: 'light',
    variables: {
      radius: '1.2rem',
      background: 'hsl(50 100% 98%)',
      foreground: 'hsl(280 25% 15%)',
      card: 'hsl(50 100% 98%)',
      cardForeground: 'hsl(280 25% 15%)',
      popover: 'hsl(50 100% 100%)',
      popoverForeground: 'hsl(280 25% 15%)',
      primary: 'hsl(330 100% 60%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(190 100% 85%)',
      secondaryForeground: 'hsl(280 25% 20%)',
      muted: 'hsl(50 40% 90%)',
      mutedForeground: 'hsl(280 15% 45%)',
      accent: 'hsl(270 100% 85%)',
      accentForeground: 'hsl(280 25% 20%)',
      destructive: 'hsl(0 80% 55%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(50 50% 85%)',
      input: 'hsl(50 50% 85%)',
      ring: 'hsl(330 100% 60%)',
    }
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    colorScheme: 'dark',
    variables: {
      radius: '0.75rem',
      background: 'hsl(240 21% 15%)',
      foreground: 'hsl(226 64% 88%)',
      card: 'hsl(240 21% 18%)',
      cardForeground: 'hsl(226 64% 88%)',
      popover: 'hsl(240 21% 18%)',
      popoverForeground: 'hsl(226 64% 88%)',
      primary: 'hsl(267 84% 81%)',
      primaryForeground: 'hsl(240 21% 15%)',
      secondary: 'hsl(240 16% 24%)',
      secondaryForeground: 'hsl(226 64% 88%)',
      muted: 'hsl(240 16% 24%)',
      mutedForeground: 'hsl(227 35% 70%)',
      accent: 'hsl(189 71% 73%)',
      accentForeground: 'hsl(240 21% 15%)',
      destructive: 'hsl(343 81% 75%)',
      destructiveForeground: 'hsl(240 21% 15%)',
      border: 'hsl(240 16% 30%)',
      input: 'hsl(240 16% 30%)',
      ring: 'hsl(267 84% 81%)',
    }
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    colorScheme: 'light',
    variables: {
      radius: '0.6rem',
      background: 'hsl(150 25% 97%)',
      foreground: 'hsl(150 20% 15%)',
      card: 'hsl(150 25% 97%)',
      cardForeground: 'hsl(150 20% 15%)',
      popover: 'hsl(150 30% 100%)',
      popoverForeground: 'hsl(150 20% 15%)',
      primary: 'hsl(150 65% 45%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(150 20% 90%)',
      secondaryForeground: 'hsl(150 20% 20%)',
      muted: 'hsl(150 20% 90%)',
      mutedForeground: 'hsl(150 10% 50%)',
      accent: 'hsl(160 55% 85%)',
      accentForeground: 'hsl(150 20% 20%)',
      destructive: 'hsl(0 70% 50%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(150 20% 88%)',
      input: 'hsl(150 20% 88%)',
      ring: 'hsl(150 65% 45%)',
    }
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    colorScheme: 'light',
    variables: {
      radius: '0.8rem',
      background: 'hsl(200 30% 98%)',
      foreground: 'hsl(200 25% 12%)',
      card: 'hsl(200 30% 98%)',
      cardForeground: 'hsl(200 25% 12%)',
      popover: 'hsl(200 40% 100%)',
      popoverForeground: 'hsl(200 25% 12%)',
      primary: 'hsl(200 75% 50%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(200 25% 92%)',
      secondaryForeground: 'hsl(200 25% 18%)',
      muted: 'hsl(200 25% 92%)',
      mutedForeground: 'hsl(200 15% 48%)',
      accent: 'hsl(190 60% 88%)',
      accentForeground: 'hsl(200 25% 18%)',
      destructive: 'hsl(0 68% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(200 20% 86%)',
      input: 'hsl(200 20% 86%)',
      ring: 'hsl(200 75% 50%)',
    }
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    colorScheme: 'light',
    variables: {
      radius: '0.7rem',
      background: 'hsl(15 35% 98%)',
      foreground: 'hsl(15 25% 10%)',
      card: 'hsl(15 35% 98%)',
      cardForeground: 'hsl(15 25% 10%)',
      popover: 'hsl(15 40% 100%)',
      popoverForeground: 'hsl(15 25% 10%)',
      primary: 'hsl(15 85% 55%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(15 30% 92%)',
      secondaryForeground: 'hsl(15 25% 18%)',
      muted: 'hsl(15 30% 92%)',
      mutedForeground: 'hsl(15 15% 48%)',
      accent: 'hsl(25 70% 88%)',
      accentForeground: 'hsl(15 25% 18%)',
      destructive: 'hsl(0 72% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(15 25% 88%)',
      input: 'hsl(15 25% 88%)',
      ring: 'hsl(15 85% 55%)',
    }
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    colorScheme: 'dark',
    variables: {
      radius: '0.5rem',
      background: 'hsl(220 30% 10%)',
      foreground: 'hsl(220 10% 95%)',
      card: 'hsl(220 30% 14%)',
      cardForeground: 'hsl(220 10% 95%)',
      popover: 'hsl(220 30% 14%)',
      popoverForeground: 'hsl(220 10% 95%)',
      primary: 'hsl(220 85% 60%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(220 20% 22%)',
      secondaryForeground: 'hsl(220 10% 92%)',
      muted: 'hsl(220 20% 22%)',
      mutedForeground: 'hsl(220 10% 65%)',
      accent: 'hsl(210 70% 55%)',
      accentForeground: 'hsl(0 0% 100%)',
      destructive: 'hsl(0 75% 58%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(220 20% 28%)',
      input: 'hsl(220 20% 28%)',
      ring: 'hsl(220 85% 60%)',
    }
  },
  {
    id: 'rose-garden',
    name: 'Rose Garden',
    colorScheme: 'light',
    variables: {
      radius: '0.9rem',
      background: 'hsl(350 35% 98%)',
      foreground: 'hsl(350 20% 12%)',
      card: 'hsl(350 35% 98%)',
      cardForeground: 'hsl(350 20% 12%)',
      popover: 'hsl(350 40% 100%)',
      popoverForeground: 'hsl(350 20% 12%)',
      primary: 'hsl(350 75% 55%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(350 25% 92%)',
      secondaryForeground: 'hsl(350 20% 18%)',
      muted: 'hsl(350 25% 92%)',
      mutedForeground: 'hsl(350 12% 48%)',
      accent: 'hsl(340 60% 88%)',
      accentForeground: 'hsl(350 20% 18%)',
      destructive: 'hsl(0 70% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(350 20% 88%)',
      input: 'hsl(350 20% 88%)',
      ring: 'hsl(350 75% 55%)',
    }
  },
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    colorScheme: 'dark',
    variables: {
      radius: '0.3rem',
      background: 'hsl(280 25% 8%)',
      foreground: 'hsl(280 10% 98%)',
      card: 'hsl(280 25% 12%)',
      cardForeground: 'hsl(280 10% 98%)',
      popover: 'hsl(280 25% 12%)',
      popoverForeground: 'hsl(280 10% 98%)',
      primary: 'hsl(280 100% 65%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(280 20% 20%)',
      secondaryForeground: 'hsl(280 10% 95%)',
      muted: 'hsl(280 20% 20%)',
      mutedForeground: 'hsl(280 10% 68%)',
      accent: 'hsl(290 95% 70%)',
      accentForeground: 'hsl(0 0% 100%)',
      destructive: 'hsl(0 85% 62%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(280 20% 25%)',
      input: 'hsl(280 20% 25%)',
      ring: 'hsl(280 100% 65%)',
    }
  },
  {
    id: 'spring-meadow',
    name: 'Spring Meadow',
    colorScheme: 'light',
    variables: {
      radius: '0.85rem',
      background: 'hsl(95 30% 97%)',
      foreground: 'hsl(95 20% 12%)',
      card: 'hsl(95 30% 97%)',
      cardForeground: 'hsl(95 20% 12%)',
      popover: 'hsl(95 35% 100%)',
      popoverForeground: 'hsl(95 20% 12%)',
      primary: 'hsl(95 55% 48%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(95 22% 90%)',
      secondaryForeground: 'hsl(95 20% 18%)',
      muted: 'hsl(95 22% 90%)',
      mutedForeground: 'hsl(95 12% 48%)',
      accent: 'hsl(85 50% 85%)',
      accentForeground: 'hsl(95 20% 18%)',
      destructive: 'hsl(0 68% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(95 20% 87%)',
      input: 'hsl(95 20% 87%)',
      ring: 'hsl(95 55% 48%)',
    }
  },
  {
    id: 'autumn-harvest',
    name: 'Autumn Harvest',
    colorScheme: 'light',
    variables: {
      radius: '0.65rem',
      background: 'hsl(35 35% 96%)',
      foreground: 'hsl(35 25% 12%)',
      card: 'hsl(35 35% 96%)',
      cardForeground: 'hsl(35 25% 12%)',
      popover: 'hsl(35 40% 100%)',
      popoverForeground: 'hsl(35 25% 12%)',
      primary: 'hsl(35 75% 50%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(35 28% 88%)',
      secondaryForeground: 'hsl(35 25% 18%)',
      muted: 'hsl(35 28% 88%)',
      mutedForeground: 'hsl(35 15% 46%)',
      accent: 'hsl(25 65% 82%)',
      accentForeground: 'hsl(35 25% 18%)',
      destructive: 'hsl(0 70% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(35 22% 85%)',
      input: 'hsl(35 22% 85%)',
      ring: 'hsl(35 75% 50%)',
    }
  },
  {
    id: 'arctic-ice',
    name: 'Arctic Ice',
    colorScheme: 'light',
    variables: {
      radius: '0.55rem',
      background: 'hsl(190 25% 98%)',
      foreground: 'hsl(190 20% 10%)',
      card: 'hsl(190 25% 98%)',
      cardForeground: 'hsl(190 20% 10%)',
      popover: 'hsl(190 30% 100%)',
      popoverForeground: 'hsl(190 20% 10%)',
      primary: 'hsl(190 70% 48%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(190 20% 93%)',
      secondaryForeground: 'hsl(190 20% 16%)',
      muted: 'hsl(190 20% 93%)',
      mutedForeground: 'hsl(190 12% 50%)',
      accent: 'hsl(180 55% 88%)',
      accentForeground: 'hsl(190 20% 16%)',
      destructive: 'hsl(0 68% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(190 18% 90%)',
      input: 'hsl(190 18% 90%)',
      ring: 'hsl(190 70% 48%)',
    }
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    colorScheme: 'light',
    variables: {
      radius: '1rem',
      background: 'hsl(340 40% 98%)',
      foreground: 'hsl(340 20% 12%)',
      card: 'hsl(340 40% 98%)',
      cardForeground: 'hsl(340 20% 12%)',
      popover: 'hsl(340 45% 100%)',
      popoverForeground: 'hsl(340 20% 12%)',
      primary: 'hsl(340 70% 60%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(340 30% 93%)',
      secondaryForeground: 'hsl(340 20% 18%)',
      muted: 'hsl(340 30% 93%)',
      mutedForeground: 'hsl(340 12% 50%)',
      accent: 'hsl(330 60% 90%)',
      accentForeground: 'hsl(340 20% 18%)',
      destructive: 'hsl(0 70% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(340 25% 90%)',
      input: 'hsl(340 25% 90%)',
      ring: 'hsl(340 70% 60%)',
    }
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    colorScheme: 'light',
    variables: {
      radius: '0.4rem',
      background: 'hsl(210 20% 98%)',
      foreground: 'hsl(210 15% 10%)',
      card: 'hsl(210 20% 98%)',
      cardForeground: 'hsl(210 15% 10%)',
      popover: 'hsl(210 25% 100%)',
      popoverForeground: 'hsl(210 15% 10%)',
      primary: 'hsl(210 80% 45%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(210 18% 92%)',
      secondaryForeground: 'hsl(210 15% 16%)',
      muted: 'hsl(210 18% 92%)',
      mutedForeground: 'hsl(210 10% 48%)',
      accent: 'hsl(210 60% 88%)',
      accentForeground: 'hsl(210 15% 16%)',
      destructive: 'hsl(0 65% 48%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(210 15% 88%)',
      input: 'hsl(210 15% 88%)',
      ring: 'hsl(210 80% 45%)',
    }
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    colorScheme: 'light',
    variables: {
      radius: '0.7rem',
      background: 'hsl(45 40% 97%)',
      foreground: 'hsl(45 20% 12%)',
      card: 'hsl(45 40% 97%)',
      cardForeground: 'hsl(45 20% 12%)',
      popover: 'hsl(45 45% 100%)',
      popoverForeground: 'hsl(45 20% 12%)',
      primary: 'hsl(45 90% 52%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(45 30% 90%)',
      secondaryForeground: 'hsl(45 20% 16%)',
      muted: 'hsl(45 30% 90%)',
      mutedForeground: 'hsl(45 12% 48%)',
      accent: 'hsl(40 75% 85%)',
      accentForeground: 'hsl(45 20% 16%)',
      destructive: 'hsl(0 68% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(45 25% 87%)',
      input: 'hsl(45 25% 87%)',
      ring: 'hsl(45 90% 52%)',
    }
  },
  {
    id: 'slate-professional',
    name: 'Slate Professional',
    colorScheme: 'light',
    variables: {
      radius: '0.35rem',
      background: 'hsl(210 10% 97%)',
      foreground: 'hsl(210 12% 8%)',
      card: 'hsl(210 10% 97%)',
      cardForeground: 'hsl(210 12% 8%)',
      popover: 'hsl(210 15% 100%)',
      popoverForeground: 'hsl(210 12% 8%)',
      primary: 'hsl(210 50% 40%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(210 12% 90%)',
      secondaryForeground: 'hsl(210 12% 16%)',
      muted: 'hsl(210 12% 90%)',
      mutedForeground: 'hsl(210 8% 48%)',
      accent: 'hsl(210 40% 85%)',
      accentForeground: 'hsl(210 12% 16%)',
      destructive: 'hsl(0 62% 46%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(210 10% 86%)',
      input: 'hsl(210 10% 86%)',
      ring: 'hsl(210 50% 40%)',
    }
  },
  {
    id: 'neon-green',
    name: 'Neon Green',
    colorScheme: 'dark',
    variables: {
      radius: '0.3rem',
      background: 'hsl(120 20% 8%)',
      foreground: 'hsl(120 10% 98%)',
      card: 'hsl(120 20% 12%)',
      cardForeground: 'hsl(120 10% 98%)',
      popover: 'hsl(120 20% 12%)',
      popoverForeground: 'hsl(120 10% 98%)',
      primary: 'hsl(120 100% 50%)',
      primaryForeground: 'hsl(120 20% 8%)',
      secondary: 'hsl(120 15% 20%)',
      secondaryForeground: 'hsl(120 10% 95%)',
      muted: 'hsl(120 15% 20%)',
      mutedForeground: 'hsl(120 10% 65%)',
      accent: 'hsl(130 95% 55%)',
      accentForeground: 'hsl(120 20% 8%)',
      destructive: 'hsl(0 85% 60%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(120 15% 25%)',
      input: 'hsl(120 15% 25%)',
      ring: 'hsl(120 100% 50%)',
    }
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    colorScheme: 'light',
    variables: {
      radius: '0.8rem',
      background: 'hsl(260 30% 98%)',
      foreground: 'hsl(260 18% 12%)',
      card: 'hsl(260 30% 98%)',
      cardForeground: 'hsl(260 18% 12%)',
      popover: 'hsl(260 35% 100%)',
      popoverForeground: 'hsl(260 18% 12%)',
      primary: 'hsl(260 60% 62%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(260 25% 92%)',
      secondaryForeground: 'hsl(260 18% 18%)',
      muted: 'hsl(260 25% 92%)',
      mutedForeground: 'hsl(260 12% 50%)',
      accent: 'hsl(270 55% 88%)',
      accentForeground: 'hsl(260 18% 18%)',
      destructive: 'hsl(0 68% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(260 20% 89%)',
      input: 'hsl(260 20% 89%)',
      ring: 'hsl(260 60% 62%)',
    }
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    colorScheme: 'light',
    variables: {
      radius: '0.75rem',
      background: 'hsl(160 30% 97%)',
      foreground: 'hsl(160 20% 12%)',
      card: 'hsl(160 30% 97%)',
      cardForeground: 'hsl(160 20% 12%)',
      popover: 'hsl(160 35% 100%)',
      popoverForeground: 'hsl(160 20% 12%)',
      primary: 'hsl(160 60% 48%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(160 22% 91%)',
      secondaryForeground: 'hsl(160 20% 18%)',
      muted: 'hsl(160 22% 91%)',
      mutedForeground: 'hsl(160 12% 48%)',
      accent: 'hsl(170 50% 86%)',
      accentForeground: 'hsl(160 20% 18%)',
      destructive: 'hsl(0 68% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(160 20% 88%)',
      input: 'hsl(160 20% 88%)',
      ring: 'hsl(160 60% 48%)',
    }
  },
  {
    id: 'crimson-dark',
    name: 'Crimson Dark',
    colorScheme: 'dark',
    variables: {
      radius: '0.5rem',
      background: 'hsl(0 25% 10%)',
      foreground: 'hsl(0 5% 96%)',
      card: 'hsl(0 25% 14%)',
      cardForeground: 'hsl(0 5% 96%)',
      popover: 'hsl(0 25% 14%)',
      popoverForeground: 'hsl(0 5% 96%)',
      primary: 'hsl(0 75% 55%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(0 18% 22%)',
      secondaryForeground: 'hsl(0 5% 93%)',
      muted: 'hsl(0 18% 22%)',
      mutedForeground: 'hsl(0 5% 65%)',
      accent: 'hsl(10 70% 58%)',
      accentForeground: 'hsl(0 0% 100%)',
      destructive: 'hsl(0 85% 62%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(0 18% 28%)',
      input: 'hsl(0 18% 28%)',
      ring: 'hsl(0 75% 55%)',
    }
  },
  {
    id: 'peach-sorbet',
    name: 'Peach Sorbet',
    colorScheme: 'light',
    variables: {
      radius: '0.9rem',
      background: 'hsl(20 40% 98%)',
      foreground: 'hsl(20 20% 12%)',
      card: 'hsl(20 40% 98%)',
      cardForeground: 'hsl(20 20% 12%)',
      popover: 'hsl(20 45% 100%)',
      popoverForeground: 'hsl(20 20% 12%)',
      primary: 'hsl(20 80% 62%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(20 32% 92%)',
      secondaryForeground: 'hsl(20 20% 18%)',
      muted: 'hsl(20 32% 92%)',
      mutedForeground: 'hsl(20 14% 50%)',
      accent: 'hsl(30 70% 88%)',
      accentForeground: 'hsl(20 20% 18%)',
      destructive: 'hsl(0 70% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(20 28% 89%)',
      input: 'hsl(20 28% 89%)',
      ring: 'hsl(20 80% 62%)',
    }
  },
  {
    id: 'teal-wave',
    name: 'Teal Wave',
    colorScheme: 'light',
    variables: {
      radius: '0.6rem',
      background: 'hsl(180 28% 97%)',
      foreground: 'hsl(180 20% 12%)',
      card: 'hsl(180 28% 97%)',
      cardForeground: 'hsl(180 20% 12%)',
      popover: 'hsl(180 32% 100%)',
      popoverForeground: 'hsl(180 20% 12%)',
      primary: 'hsl(180 65% 45%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(180 22% 90%)',
      secondaryForeground: 'hsl(180 20% 18%)',
      muted: 'hsl(180 22% 90%)',
      mutedForeground: 'hsl(180 12% 48%)',
      accent: 'hsl(170 55% 85%)',
      accentForeground: 'hsl(180 20% 18%)',
      destructive: 'hsl(0 68% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(180 20% 87%)',
      input: 'hsl(180 20% 87%)',
      ring: 'hsl(180 65% 45%)',
    }
  },
  {
    id: 'charcoal-pro',
    name: 'Charcoal Pro',
    colorScheme: 'dark',
    variables: {
      radius: '0.4rem',
      background: 'hsl(0 0% 9%)',
      foreground: 'hsl(0 0% 96%)',
      card: 'hsl(0 0% 13%)',
      cardForeground: 'hsl(0 0% 96%)',
      popover: 'hsl(0 0% 13%)',
      popoverForeground: 'hsl(0 0% 96%)',
      primary: 'hsl(210 70% 58%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(0 0% 20%)',
      secondaryForeground: 'hsl(0 0% 93%)',
      muted: 'hsl(0 0% 20%)',
      mutedForeground: 'hsl(0 0% 65%)',
      accent: 'hsl(200 60% 55%)',
      accentForeground: 'hsl(0 0% 100%)',
      destructive: 'hsl(0 75% 58%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(0 0% 26%)',
      input: 'hsl(0 0% 26%)',
      ring: 'hsl(210 70% 58%)',
    }
  },
  {
    id: 'berry-blast',
    name: 'Berry Blast',
    colorScheme: 'light',
    variables: {
      radius: '0.75rem',
      background: 'hsl(320 35% 97%)',
      foreground: 'hsl(320 20% 12%)',
      card: 'hsl(320 35% 97%)',
      cardForeground: 'hsl(320 20% 12%)',
      popover: 'hsl(320 40% 100%)',
      popoverForeground: 'hsl(320 20% 12%)',
      primary: 'hsl(320 70% 52%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(320 28% 90%)',
      secondaryForeground: 'hsl(320 20% 18%)',
      muted: 'hsl(320 28% 90%)',
      mutedForeground: 'hsl(320 14% 48%)',
      accent: 'hsl(310 60% 86%)',
      accentForeground: 'hsl(320 20% 18%)',
      destructive: 'hsl(0 70% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(320 24% 88%)',
      input: 'hsl(320 24% 88%)',
      ring: 'hsl(320 70% 52%)',
    }
  },
  {
    id: 'sapphire-night',
    name: 'Sapphire Night',
    colorScheme: 'dark',
    variables: {
      radius: '0.6rem',
      background: 'hsl(230 28% 10%)',
      foreground: 'hsl(230 8% 96%)',
      card: 'hsl(230 28% 14%)',
      cardForeground: 'hsl(230 8% 96%)',
      popover: 'hsl(230 28% 14%)',
      popoverForeground: 'hsl(230 8% 96%)',
      primary: 'hsl(230 75% 58%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(230 22% 22%)',
      secondaryForeground: 'hsl(230 8% 93%)',
      muted: 'hsl(230 22% 22%)',
      mutedForeground: 'hsl(230 8% 65%)',
      accent: 'hsl(220 70% 60%)',
      accentForeground: 'hsl(0 0% 100%)',
      destructive: 'hsl(0 75% 58%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(230 22% 28%)',
      input: 'hsl(230 22% 28%)',
      ring: 'hsl(230 75% 58%)',
    }
  },
  {
    id: 'lime-zest',
    name: 'Lime Zest',
    colorScheme: 'light',
    variables: {
      radius: '0.65rem',
      background: 'hsl(75 35% 97%)',
      foreground: 'hsl(75 20% 12%)',
      card: 'hsl(75 35% 97%)',
      cardForeground: 'hsl(75 20% 12%)',
      popover: 'hsl(75 40% 100%)',
      popoverForeground: 'hsl(75 20% 12%)',
      primary: 'hsl(75 65% 48%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(75 28% 90%)',
      secondaryForeground: 'hsl(75 20% 18%)',
      muted: 'hsl(75 28% 90%)',
      mutedForeground: 'hsl(75 14% 48%)',
      accent: 'hsl(70 55% 85%)',
      accentForeground: 'hsl(75 20% 18%)',
      destructive: 'hsl(0 68% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(75 24% 87%)',
      input: 'hsl(75 24% 87%)',
      ring: 'hsl(75 65% 48%)',
    }
  },
  {
    id: 'coral-reef',
    name: 'Coral Reef',
    colorScheme: 'light',
    variables: {
      radius: '0.7rem',
      background: 'hsl(10 38% 97%)',
      foreground: 'hsl(10 22% 12%)',
      card: 'hsl(10 38% 97%)',
      cardForeground: 'hsl(10 22% 12%)',
      popover: 'hsl(10 42% 100%)',
      popoverForeground: 'hsl(10 22% 12%)',
      primary: 'hsl(10 78% 58%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(10 30% 91%)',
      secondaryForeground: 'hsl(10 22% 18%)',
      muted: 'hsl(10 30% 91%)',
      mutedForeground: 'hsl(10 15% 48%)',
      accent: 'hsl(15 65% 86%)',
      accentForeground: 'hsl(10 22% 18%)',
      destructive: 'hsl(0 70% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(10 26% 88%)',
      input: 'hsl(10 26% 88%)',
      ring: 'hsl(10 78% 58%)',
    }
  },
  {
    id: 'indigo-dusk',
    name: 'Indigo Dusk',
    colorScheme: 'dark',
    variables: {
      radius: '0.55rem',
      background: 'hsl(250 30% 11%)',
      foreground: 'hsl(250 10% 96%)',
      card: 'hsl(250 30% 15%)',
      cardForeground: 'hsl(250 10% 96%)',
      popover: 'hsl(250 30% 15%)',
      popoverForeground: 'hsl(250 10% 96%)',
      primary: 'hsl(250 70% 60%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(250 22% 23%)',
      secondaryForeground: 'hsl(250 10% 93%)',
      muted: 'hsl(250 22% 23%)',
      mutedForeground: 'hsl(250 10% 66%)',
      accent: 'hsl(240 65% 62%)',
      accentForeground: 'hsl(0 0% 100%)',
      destructive: 'hsl(0 75% 58%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(250 22% 29%)',
      input: 'hsl(250 22% 29%)',
      ring: 'hsl(250 70% 60%)',
    }
  },
  {
    id: 'honey-gold',
    name: 'Honey Gold',
    colorScheme: 'light',
    variables: {
      radius: '0.8rem',
      background: 'hsl(42 38% 97%)',
      foreground: 'hsl(42 22% 12%)',
      card: 'hsl(42 38% 97%)',
      cardForeground: 'hsl(42 22% 12%)',
      popover: 'hsl(42 42% 100%)',
      popoverForeground: 'hsl(42 22% 12%)',
      primary: 'hsl(42 85% 50%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(42 30% 90%)',
      secondaryForeground: 'hsl(42 22% 18%)',
      muted: 'hsl(42 30% 90%)',
      mutedForeground: 'hsl(42 15% 48%)',
      accent: 'hsl(38 70% 84%)',
      accentForeground: 'hsl(42 22% 18%)',
      destructive: 'hsl(0 68% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(42 26% 87%)',
      input: 'hsl(42 26% 87%)',
      ring: 'hsl(42 85% 50%)',
    }
  },
  {
    id: 'steel-gray',
    name: 'Steel Gray',
    colorScheme: 'light',
    variables: {
      radius: '0.3rem',
      background: 'hsl(200 8% 97%)',
      foreground: 'hsl(200 10% 10%)',
      card: 'hsl(200 8% 97%)',
      cardForeground: 'hsl(200 10% 10%)',
      popover: 'hsl(200 10% 100%)',
      popoverForeground: 'hsl(200 10% 10%)',
      primary: 'hsl(200 35% 42%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(200 10% 91%)',
      secondaryForeground: 'hsl(200 10% 16%)',
      muted: 'hsl(200 10% 91%)',
      mutedForeground: 'hsl(200 7% 48%)',
      accent: 'hsl(200 30% 84%)',
      accentForeground: 'hsl(200 10% 16%)',
      destructive: 'hsl(0 62% 46%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(200 8% 85%)',
      input: 'hsl(200 8% 85%)',
      ring: 'hsl(200 35% 42%)',
    }
  },
  {
    id: 'magenta-vibe',
    name: 'Magenta Vibe',
    colorScheme: 'dark',
    variables: {
      radius: '0.7rem',
      background: 'hsl(310 28% 10%)',
      foreground: 'hsl(310 8% 96%)',
      card: 'hsl(310 28% 14%)',
      cardForeground: 'hsl(310 8% 96%)',
      popover: 'hsl(310 28% 14%)',
      popoverForeground: 'hsl(310 8% 96%)',
      primary: 'hsl(310 85% 62%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(310 22% 22%)',
      secondaryForeground: 'hsl(310 8% 93%)',
      muted: 'hsl(310 22% 22%)',
      mutedForeground: 'hsl(310 8% 65%)',
      accent: 'hsl(320 80% 65%)',
      accentForeground: 'hsl(0 0% 100%)',
      destructive: 'hsl(0 80% 60%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(310 22% 28%)',
      input: 'hsl(310 22% 28%)',
      ring: 'hsl(310 85% 62%)',
    }
  },
  {
    id: 'sky-blue',
    name: 'Sky Blue',
    colorScheme: 'light',
    variables: {
      radius: '0.85rem',
      background: 'hsl(195 32% 98%)',
      foreground: 'hsl(195 20% 12%)',
      card: 'hsl(195 32% 98%)',
      cardForeground: 'hsl(195 20% 12%)',
      popover: 'hsl(195 36% 100%)',
      popoverForeground: 'hsl(195 20% 12%)',
      primary: 'hsl(195 75% 52%)',
      primaryForeground: 'hsl(0 0% 100%)',
      secondary: 'hsl(195 25% 92%)',
      secondaryForeground: 'hsl(195 20% 18%)',
      muted: 'hsl(195 25% 92%)',
      mutedForeground: 'hsl(195 14% 50%)',
      accent: 'hsl(190 60% 87%)',
      accentForeground: 'hsl(195 20% 18%)',
      destructive: 'hsl(0 68% 52%)',
      destructiveForeground: 'hsl(0 0% 100%)',
      border: 'hsl(195 22% 89%)',
      input: 'hsl(195 22% 89%)',
      ring: 'hsl(195 75% 52%)',
    }
  }
]

export function getThemeById(id: string): ThemeConfig | undefined {
  return themes.find(theme => theme.id === id)
}

export function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement
  
  // Create a copy of variables with sidebar defaults if not defined
  const variables = { ...theme.variables }
  
  // Auto-fill sidebar colors if not defined
  if (!variables.sidebar) {
    variables.sidebar = variables.secondary || variables.card || variables.background
  }
  if (!variables.sidebarForeground) {
    variables.sidebarForeground = variables.foreground
  }
  if (!variables.sidebarPrimary) {
    variables.sidebarPrimary = variables.primary
  }
  if (!variables.sidebarPrimaryForeground) {
    variables.sidebarPrimaryForeground = variables.primaryForeground
  }
  if (!variables.sidebarAccent) {
    variables.sidebarAccent = variables.muted || variables.accent
  }
  if (!variables.sidebarAccentForeground) {
    variables.sidebarAccentForeground = variables.foreground
  }
  if (!variables.sidebarBorder) {
    variables.sidebarBorder = variables.border
  }
  if (!variables.sidebarRing) {
    variables.sidebarRing = variables.primary
  }
  
  // Auto-generate chart colors based on primary/accent if not defined
  // This ensures node palette colors match the theme
  if (!variables.chart1) {
    variables.chart1 = variables.primary
  }
  if (!variables.chart2) {
    // Use accent or a variation of primary
    variables.chart2 = variables.accent || adjustHue(variables.primary, 60)
  }
  if (!variables.chart3) {
    variables.chart3 = adjustHue(variables.primary, 120)
  }
  if (!variables.chart4) {
    variables.chart4 = adjustHue(variables.primary, 180)
  }
  if (!variables.chart5) {
    variables.chart5 = adjustHue(variables.primary, 240)
  }
  
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined) {
      // Convert camelCase to kebab-case
      const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      root.style.setProperty(`--${cssVarName}`, value)
    }
  })
  
  // Update color-scheme for proper browser rendering
  root.style.setProperty('color-scheme', theme.colorScheme)
}

// Helper function to adjust hue of an HSL color
function adjustHue(hslColor: string, degreeShift: number): string {
  // Parse HSL color string like "hsl(216 105% 59%)"
  const match = hslColor.match(/hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)/)
  if (!match) return hslColor
  
  const [, h, s, l] = match
  const newHue = (parseFloat(h) + degreeShift) % 360
  return `hsl(${newHue} ${s}% ${l}%)`
}

