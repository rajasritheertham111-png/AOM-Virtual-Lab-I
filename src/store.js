import { create } from 'zustand';

export const useStore = create((set) => ({
    hasEntered: false,
    activeExperiment: 1,
    laserPower: false,
    laserInputPower: 100, // mW (0 - 200)
    rfFrequency: 100, // 80 - 120 MHz
    rfPower: 50, // 0 - 100 %
    modulation: false, // square wave modulation
    modulationFreq: 1, // KHz
    beamDiameter: 2, // mm (1 - 5)

    enterLab: () => set({ hasEntered: true }),
    setActiveExperiment: (exp) => set({ activeExperiment: exp }),
    toggleLaser: () => set((state) => ({ laserPower: !state.laserPower })),
    setLaserInputPower: (power) => set({ laserInputPower: power }),
    setRfFrequency: (freq) => set({ rfFrequency: freq }),
    setRfPower: (power) => set({ rfPower: power }),
    toggleModulation: () => set((state) => ({ modulation: !state.modulation })),
    setModulationFreq: (freq) => set({ modulationFreq: freq }),
    setBeamDiameter: (dia) => set({ beamDiameter: dia }),
}));
