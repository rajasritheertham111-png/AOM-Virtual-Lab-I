import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Text, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Power, Activity, Zap, PlaySquare } from 'lucide-react';
import { useStore } from './store';

// --- Calculations ---
// Exp 1: Bragg Angle computation
const calculateAngle = (f_MHz) => {
    const lambda = 850e-9;
    const f = f_MHz * 1e6;
    const va = 4200;
    return (lambda * f) / va; // radians
};

// Exp 2: Efficiency computation
const calculateEfficiency = (rfPower_percent) => {
    // eta = sin^2(k * sqrt(Prf))
    // using k such that 100% -> efficiency 1
    const maxK = Math.PI / 2;
    const k = maxK / Math.sqrt(100);
    const val = k * Math.sqrt(rfPower_percent);
    return Math.pow(Math.sin(val), 2);
};

// Exp 3: Rise Time
const calculateRiseTime = (d_mm) => {
    const d = d_mm * 1e-3; // meters
    const va = 4200;
    return (0.64 * d) / va; // seconds
};

// --- Educational Content (20 Experiments) ---
const EXPERIMENTS = [
    { id: 1, category: 'Core Experiments', title: 'Beam Steering Using AOM', objective: 'Demonstrate how changing RF frequency alters the diffraction angle of the laser beam.', setup: 'Laser → Mirror → Lens → AOM → Detector', procedure: 'Vary RF frequency using the function generator and observe beam deflection.', outcome: 'Understand Bragg diffraction and angular beam control.', controls: { rfFreq: true } },
    { id: 2, category: 'Core Experiments', title: 'Diffraction Efficiency vs RF Power', objective: 'Measure how the intensity of the diffracted beam changes with RF input power.', setup: 'Laser → Mirror → Lens → AOM → Photodetector → Oscilloscope', procedure: 'Vary RF amplitude and record output signal on oscilloscope.', outcome: 'Explore the relationship between acoustic wave amplitude and light modulation.', controls: { rfPower: true } },
    { id: 3, category: 'Core Experiments', title: 'Temporal Modulation of Laser Beam', objective: 'Use AOM to modulate laser intensity in time domain.', setup: 'Laser → Mirror → Lens → AOM → Detector → Oscilloscope', procedure: 'Apply square wave from function generator to AOM and observe intensity modulation.', outcome: 'Learn how AOMs act as optical switches or modulators.', controls: { modulation: true, beamDia: true } },
    { id: 4, category: 'Advanced Diagnostics', title: 'Bragg Condition Alignment', objective: 'Align the AOM to satisfy Bragg condition for maximum diffraction.', setup: 'Laser → Mirror → Lens → AOM → Screen', procedure: 'Adjust AOM angle and RF frequency to find optimal diffraction.', outcome: 'Understand phase matching and acoustic-optic interaction geometry.', controls: { rfFreq: true, rfPower: true } },
    { id: 5, category: 'Advanced Diagnostics', title: 'Frequency Shift Measurement', objective: 'Measure the frequency shift of the diffracted beam due to Doppler effect.', setup: 'Laser → AOM → Interferometer', procedure: 'Analyze beat frequency between undiffracted and diffracted beams.', outcome: 'Explore frequency modulation and Doppler shift in optics.', controls: { rfFreq: true } },
    { id: 6, category: 'Modulation & Switching', title: 'Optical Switching & Pulse Generation', objective: 'Use AOM to switch laser beams on/off rapidly.', setup: 'Function generator → AOM → Detector', procedure: 'Generate optical pulses and measure pulse width and timing.', outcome: 'Demonstrates AOM as a fast optical switch for time-domain control.', controls: { modulation: true } },
    { id: 7, category: 'Modulation & Switching', title: 'Amplitude Modulation of Laser Beam', objective: 'Modulate laser intensity using analog RF signals.', setup: 'Function generator → AOM → Detector', procedure: 'Observe sinusoidal modulation of light intensity.', outcome: 'Introduces analog modulation concepts in optics.', controls: { rfPower: true, modulation: true } },
    { id: 8, category: 'Advanced Diagnostics', title: 'Laser Beam Deflection Mapping', objective: 'Quantify beam deflection angle vs RF frequency.', setup: 'Laser → AOM → Screen', procedure: 'Record beam position for different RF frequencies.', outcome: 'Builds understanding of spatial beam control and calibration.', controls: { rfFreq: true } },
    { id: 9, category: 'Special Applications', title: 'Multi-Frequency Beam Splitting', objective: 'Generate multiple diffracted beams using composite RF signals.', setup: 'RF mixer → AOM → Screen', procedure: 'Apply two RF frequencies and observe dual beam paths (Simulated).', outcome: 'Demonstrates frequency multiplexing in optical domain.', controls: { rfFreq: true } },
    { id: 10, category: 'Modulation & Switching', title: 'Real-Time Signal Visualization', objective: 'Correlate RF input waveform with optical output.', setup: 'Function generator → AOM → Detector → Oscilloscope', procedure: 'Compare RF signal and optical response side-by-side.', outcome: 'Reinforces signal processing concepts with optical feedback.', controls: { modulation: true } },
    { id: 11, category: 'Special Applications', title: 'AOM-Based Intensity Stabilization', objective: 'Use feedback to stabilize laser intensity via AOM control.', setup: 'Laser → AOM → Detector → Feedback loop', procedure: 'Monitor output and adjust RF amplitude to maintain constant intensity.', outcome: 'Introduces control systems and feedback in optics.', controls: { rfPower: true } },
    { id: 12, category: 'Special Applications', title: 'RF Frequency Sweep Tracking', objective: 'Sweep RF frequency and track beam movement across a screen.', setup: 'Function generator → AOM → Camera', procedure: 'Record beam path as frequency changes.', outcome: 'Demonstrates continuous beam steering and spatial mapping.', controls: { rfFreq: true } },
    { id: 13, category: 'Modulation & Switching', title: 'AOM as Optical Chopper', objective: 'Replace mechanical chopper with AOM for high-speed modulation.', setup: 'Laser → AOM → Detector', procedure: 'Apply square wave RF signal and measure chopping frequency.', outcome: 'Highlights AOM’s speed advantage over mechanical systems.', controls: { modulation: true } },
    { id: 14, category: 'Advanced Diagnostics', title: 'RF Signal Characterization', objective: 'Analyze RF waveform properties and correlate with optical output.', setup: 'Function generator → Oscilloscope', procedure: 'Compare amplitude, frequency, and phase between RF and light.', outcome: 'Bridges electronics and optics domains.', controls: { modulation: true, rfPower: true } },
    { id: 15, category: 'Advanced Diagnostics', title: 'Beam Profile Analysis', objective: 'Study spatial profile of diffracted beam.', setup: 'Laser → Mirror → Lens → AOM → Beam profiler', procedure: 'Capture and analyze beam shape, divergence, and intensity.', outcome: 'Teaches beam diagnostics and optical quality assessment.', controls: { beamDia: true } },
    { id: 16, category: 'Modulation & Switching', title: 'Acousto-Optic Q-Switch Simulation', objective: 'Simulate Q-switching behavior using AOM.', setup: 'Laser cavity with AOM → RF control', procedure: 'Modulate RF to simulate cavity dumping and pulse generation.', outcome: 'Introduces laser dynamics and pulse generation techniques.', controls: { modulation: true } },
    { id: 17, category: 'Modulation & Switching', title: 'Frequency Modulation (FM)', objective: 'Apply FM signal to AOM and observe frequency shift.', setup: 'Function generator → AOM → Spectrum analyzer', procedure: 'Analyze frequency components of modulated light.', outcome: 'Bridges RF modulation theory with optical frequency control.', controls: { rfFreq: true, modulation: true } },
    { id: 18, category: 'Special Applications', title: 'Laser Beam Raster Scanning', objective: 'Use AOM to steer beam in one axis to simulate raster scan.', setup: 'Laser → AOM → Mirror → Screen', procedure: 'Synchronize RF sweep with scanning motion.', outcome: 'Demonstrates principles behind LiDAR and laser imaging.', controls: { rfFreq: true } },
    { id: 19, category: 'Modulation & Switching', title: 'AOM as Optical Attenuator', objective: 'Control beam intensity dynamically using RF amplitude.', setup: 'Laser → AOM → Detector', procedure: 'Vary RF amplitude and observe corresponding optical power.', outcome: 'Shows how AOMs can be used for power regulation.', controls: { rfPower: true } },
    { id: 20, category: 'Special Applications', title: 'Acousto-Optic Spectral Filtering', objective: 'Select specific wavelengths from a broadband source.', setup: 'Broadband source → AOTF → Detector', procedure: 'Tune RF frequency to pass desired wavelength (Simulated 850nm).', outcome: 'Demonstrates wavelength-selective filtering for spectroscopy.', controls: { rfFreq: true } }
];

const groupedExperiments = EXPERIMENTS.reduce((acc, exp) => {
    if (!acc[exp.category]) acc[exp.category] = [];
    acc[exp.category].push(exp);
    return acc;
}, {});

// --- 3D Components ---
const LineCylinder = React.forwardRef(({ start, end, radius, color, opacity, transparent = true }, ref) => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const distance = startVec.distanceTo(endVec);
    const position = startVec.clone().lerp(endVec, 0.5);

    const axis = new THREE.Vector3(0, 1, 0);
    const direction = endVec.clone().sub(startVec).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction);

    return (
        <mesh position={position} quaternion={quaternion}>
            <cylinderGeometry args={[radius, radius, distance, 16]} />
            <meshBasicMaterial ref={ref} color={color} transparent={transparent} opacity={opacity} />
        </mesh>
    );
});

const OpticalBench = () => (
    <group position={[1.5, -0.5, 1.0]}>
        <Box args={[6, 0.4, 4]} position={[0, -0.2, 0]}>
            <meshStandardMaterial color="#2d3748" metalness={0.5} roughness={0.7} />
        </Box>
        <Grid infiniteGrid fadeDistance={10} sectionColor="#4a5568" cellColor="#2d3748" position={[0, 0.01, 0]} />
    </group>
);

const CompactLaserDiode = ({ position = [-0.25, 0.25, 1.75] }) => (
    <group position={position}>
        <Box args={[0.6, 0.3, 0.3]} position={[-0.3, 0, 0]}>
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
        </Box>
        <Box args={[0.05, 0.35, 0.35]} position={[0.05, 0, 0]}>
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
        </Box>
        <Text position={[-0.2, 0.5, 0]} fontSize={0.12} color="white">Compact Diode Module</Text>
        <Text position={[-0.2, 0.35, 0]} fontSize={0.08} color="#94a3b8">850nm, 20mW (Shutter)</Text>
    </group>
);

const FreeSpaceIsolator = ({ position = [0.3, 0.25, 1.75] }) => (
    <group position={position}>
        <Cylinder args={[0.15, 0.15, 0.4]} rotation={[0, 0, Math.PI / 2]}>
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </Cylinder>
        <Cylinder args={[0.18, 0.18, 0.1]} rotation={[0, 0, Math.PI / 2]}>
            <meshStandardMaterial color="#b91c1c" metalness={0.3} roughness={0.7} />
        </Cylinder>
        <Text position={[0, 0.25, 0]} fontSize={0.1} color="white">Free-Space Isolator</Text>
    </group>
);

const RFDriver3910 = () => (
    <group position={[1.5, -0.1, 2.5]}>
        <Box args={[1.2, 0.6, 0.8]}>
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </Box>
        <Box args={[1.21, 0.4, 0.6]} position={[0, 0.05, 0]}>
            <meshBasicMaterial color="#020617" />
        </Box>
        <Text position={[0, 0.4, 0]} fontSize={0.1} color="white">3910 Series AOM RF Driver</Text>
        <Text position={[-0.3, 0.1, 0.31]} fontSize={0.06} color="#38bdf8">PWR: 8W</Text>
        <Text position={[0.3, 0.1, 0.31]} fontSize={0.06} color="#38bdf8">FREQ: 45-500 MHz</Text>
    </group>
);

const Mirror = ({ position, name, rotY }) => (
    <group position={position}>
        <Cylinder args={[0.2, 0.2, 0.02]} rotation={[Math.PI / 2, rotY, 0]}>
            <meshStandardMaterial color="silver" metalness={1} roughness={0} />
        </Cylinder>
        <Text position={[0, 0.3, 0]} fontSize={0.12} color="white">{name}</Text>
    </group>
);

const Lens = ({ position, name, textY = 0.3 }) => (
    <group position={position}>
        <Cylinder args={[0.2, 0.2, 0.05]} rotation={[0, 0, Math.PI / 2]}>
            <meshPhysicalMaterial color="skyblue" transparent opacity={0.5} transmission={0.9} roughness={0.1} />
        </Cylinder>
        <Text position={[0, textY, 0]} fontSize={0.12} color="white">{name}</Text>
    </group>
);

const BeamsplitterCube = () => (
    <group position={[2.60, 0.25, 0.60]}>
        <Box args={[0.15, 0.15, 0.15]}>
            <meshPhysicalMaterial color="#e0f2fe" transparent opacity={0.4} transmission={0.9} roughness={0.1} ior={1.5} />
        </Box>
        <Text position={[0, 0.45, 0]} fontSize={0.08} color="white">Beamsplitter</Text>
    </group>
);

const AOM3080_122 = () => (
    <group position={[2.80, 0.25, 0.60]}>
        <Box args={[0.3, 0.1, 0.3]} position={[0, -0.15, 0]}>
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </Box>
        <Box args={[0.25, 0.25, 0.25]}>
            <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} />
        </Box>
        <Box args={[0.1, 0.15, 0.26]} position={[0, 0, 0]}>
            <meshPhysicalMaterial color="#c6f6d5" transparent opacity={0.6} transmission={0.9} roughness={0.1} thickness={0.5} />
        </Box>
        <Text position={[0, 0.35, 0]} fontSize={0.1} color="white">AOM 3080-122</Text>
        <Text position={[0, 0.25, 0.13]} fontSize={0.06} color="#94a3b8">TeO2 Crystal</Text>
    </group>
);

const IRDetectorCard = () => {
    const { laserPower, activeExperiment, rfFrequency, rfPower } = useStore();

    const angle = calculateAngle(rfFrequency) * 15;
    const dY = 0.55 * Math.sin(angle);

    let efficiency = 0;
    if (activeExperiment === 1) efficiency = 0.5;
    if (activeExperiment === 2) efficiency = calculateEfficiency(rfPower);
    if (activeExperiment === 3) efficiency = 0.8;

    const opacity0 = laserPower ? (1 - efficiency) * 0.9 : 0;
    const opacity1 = laserPower ? efficiency * 0.9 : 0;

    return (
        <group position={[3.35, 0.25, 0.60]}>
            <Box args={[0.01, 0.8, 0.8]}>
                <meshStandardMaterial color="#bef264" roughness={0.8} />
            </Box>
            <Box args={[0.012, 0.85, 0.85]} position={[-0.005, 0, 0]}>
                <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </Box>
            <mesh position={[-0.011, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <circleGeometry args={[0.03, 32]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={opacity0} depthTest={false} />
            </mesh>
            <mesh position={[-0.011, dY, 0]} rotation={[0, Math.PI / 2, 0]}>
                <circleGeometry args={[0.06, 32]} />
                <meshBasicMaterial color="#f87171" transparent opacity={opacity1} depthTest={false} />
            </mesh>
            <Text position={[0.01, 0.35, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.06} color="black" fontWeight="bold">IR Detector Card</Text>
            <Text position={[0.01, 0.28, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.04} color="#333">700-1400 nm</Text>
        </group>
    );
};

const Beam = () => {
    const { laserPower, rfFrequency, rfPower, beamDiameter, activeExperiment, modulation, modulationFreq } = useStore();
    const beamRef1 = useRef();

    const selectedExp = EXPERIMENTS.find(e => e.id === activeExperiment) || EXPERIMENTS[0];
    const setupStr = selectedExp.setup.toLowerCase();

    const hasMirror = setupStr.includes('mirror');
    const hasLens = setupStr.includes('lens');
    const hasBS = setupStr.includes('interferometer') || setupStr.includes('beamsplitter');

    const displayAngle = calculateAngle(rfFrequency) * 15;
    const dX = 0.55 * Math.cos(displayAngle);
    const dY = 0.55 * Math.sin(displayAngle);

    let efficiency = 0;
    if (activeExperiment === 1) efficiency = 0.5;
    if (activeExperiment === 2) efficiency = calculateEfficiency(rfPower);
    if (activeExperiment === 3) efficiency = 0.8;

    const scale = beamDiameter / 2.5;
    const thickBase = 0.08 * scale; // Doubled thickness
    const thinBase = 0.04 * scale;  // Tripled thin beam thickness

    const opacity0 = laserPower ? (1 - efficiency) * 0.8 : 0;
    const opacity1 = laserPower ? efficiency * 0.8 : 0;

    useFrame(({ clock }) => {
        if (!laserPower) return;
        let finalOpacity1 = opacity1;
        if (activeExperiment === 3 && modulation) {
            const period = 1 / modulationFreq;
            const t = clock.getElapsedTime() % period;
            finalOpacity1 = (t < period / 2) ? opacity1 : 0.05;
        }
        if (beamRef1.current) {
            beamRef1.current.opacity = finalOpacity1;
        }
    });

    const pLaserOriginal = [-0.25, 0.25, 1.75];
    const pLaserStraight = [0.00, 0.25, 0.60];
    const pLaser = hasMirror ? pLaserOriginal : pLaserStraight;

    const pM1 = [1.00, 0.25, 1.75];
    const pM2 = [1.00, 0.25, 0.60];
    const pL1 = [2.00, 0.25, 0.60];
    const pL2 = [2.40, 0.25, 0.60];
    const pBS = [2.60, 0.25, 0.60];
    const pBSReflect = [2.60, 0.25, 1.00];
    const pAOM = [2.80, 0.25, 0.60];
    const p0th = [3.35, 0.25, 0.60];
    const p1st = [2.80 + dX, 0.25 + dY, 0.60];

    return (
        <group>
            {hasMirror ? (
                <>
                    <LineCylinder start={pLaser} end={pM1} radius={thickBase} color="#ef4444" opacity={laserPower ? 0.8 : 0} />
                    <LineCylinder start={pM1} end={pM2} radius={thickBase} color="#ef4444" opacity={laserPower ? 0.8 : 0} />
                    <LineCylinder start={pM2} end={hasLens ? pL1 : (hasBS ? pBS : pAOM)} radius={thickBase} color="#ef4444" opacity={laserPower ? 0.8 : 0} />
                </>
            ) : (
                <LineCylinder start={pLaser} end={hasLens ? pL1 : (hasBS ? pBS : pAOM)} radius={thickBase} color="#ef4444" opacity={laserPower ? 0.8 : 0} />
            )}

            {hasLens && (
                <>
                    <LineCylinder start={pL1} end={pL2} radius={thinBase * 2} color="#ef4444" opacity={laserPower ? 0.8 : 0} />
                    <LineCylinder start={pL2} end={hasBS ? pBS : pAOM} radius={thinBase} color="#ef4444" opacity={laserPower ? 0.8 : 0} />
                </>
            )}

            {hasBS && (
                <>
                    <LineCylinder start={pBS} end={pBSReflect} radius={thinBase * 0.5} color="#ef4444" opacity={laserPower ? 0.4 : 0} />
                    <LineCylinder start={pBS} end={pAOM} radius={thinBase} color="#ef4444" opacity={laserPower ? 0.8 : 0} />
                </>
            )}

            <LineCylinder start={pAOM} end={p0th} radius={thinBase} color="#ef4444" opacity={opacity0} />
            <LineCylinder start={pAOM} end={p1st} radius={thinBase * 3} color="#f87171" opacity={opacity1} ref={beamRef1} />
        </group>
    );
};

// --- User Interface Components ---
const Dashboard = () => {
    const {
        activeExperiment, setActiveExperiment, laserPower, toggleLaser, laserInputPower, setLaserInputPower,
        rfFrequency, setRfFrequency, rfPower, setRfPower,
        modulation, toggleModulation, modulationFreq, setModulationFreq,
        beamDiameter, setBeamDiameter
    } = useStore();

    const selectedExp = EXPERIMENTS.find(e => e.id === activeExperiment) || EXPERIMENTS[0];

    return (
        <div className="absolute top-0 left-0 h-full w-[26rem] bg-slate-900 border-r border-slate-700 p-6 flex flex-col gap-6 z-10 overflow-hidden shadow-2xl">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent pb-2 border-slate-700 border-b shrink-0">Virtual AOM Lab</h1>

            {/* Master Settings */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg shrink-0">
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <div>
                        <span className="font-bold text-slate-200 uppercase tracking-wider block">Master Power</span>
                        <span className="text-xs text-slate-400">Main laser line and interlocks</span>
                    </div>
                    <button
                        onClick={toggleLaser}
                        className={`p-4 rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center ${laserPower ? 'bg-red-500 text-white shadow-red-500/50 scale-110' : 'bg-slate-700 text-slate-400'}`}
                    >
                        <Power size={28} />
                    </button>
                </div>
                {laserPower && (
                    <div className="p-4 bg-slate-900/30">
                        <label className="flex justify-between text-sm mb-3">
                            <span className="text-slate-300 font-medium">Input Power ({"$P_{in}$"})</span>
                            <span className="text-red-400 font-mono bg-red-900/30 px-2 rounded">{laserInputPower} mW</span>
                        </label>
                        <input
                            type="range" min="0" max="200" step="1"
                            value={laserInputPower} onChange={(e) => setLaserInputPower(Number(e.target.value))}
                            className="w-full accent-red-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                )}
            </div>

            {/* Experiment Selector */}
            <div className="flex-1 min-h-0 flex flex-col border border-slate-700 rounded-xl bg-slate-800/80 shadow-inner">
                <div className="p-3 bg-slate-800 border-b border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Select Experiment</span>
                    <select
                        value={activeExperiment}
                        onChange={(e) => setActiveExperiment(Number(e.target.value))}
                        className="w-full bg-slate-900 text-slate-200 text-sm rounded-lg border border-slate-600 focus:ring-blue-500 focus:border-blue-500 truncate"
                    >
                        {Object.entries(groupedExperiments).map(([category, exps]) => (
                            <optgroup key={category} label={category}>
                                {exps.map((exp) => (
                                    <option key={exp.id} value={exp.id}>
                                        {exp.title}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {/* Active Experiment Area */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <h2 className="text-lg font-bold text-emerald-400 mb-2">{selectedExp.title}</h2>
                    <div className="space-y-3 text-sm text-slate-300 mb-6">
                        <p><strong className="text-slate-100">Objective:</strong> {selectedExp.objective}</p>
                        <p><strong className="text-slate-100">Setup:</strong> <span className="text-xs bg-slate-900 px-1 py-0.5 rounded border border-slate-700 font-mono">{selectedExp.setup}</span></p>
                        <p><strong className="text-slate-100">Procedure:</strong> {selectedExp.procedure}</p>
                        <div className="bg-emerald-900/20 border border-emerald-800/50 p-3 rounded-lg mt-2 text-emerald-100">
                            <strong>Outcome:</strong> {selectedExp.outcome}
                        </div>
                    </div>

                    {/* Dynamic Controls */}
                    <div className="space-y-6 pt-4 border-t border-slate-700/50">
                        {selectedExp.controls.rfFreq && (
                            <div>
                                <label className="flex justify-between text-sm mb-3 text-slate-300">
                                    <span className="font-medium">RF Frequency (f)</span>
                                    <span className="text-blue-400 font-mono bg-blue-900/30 px-2 rounded">{rfFrequency} MHz</span>
                                </label>
                                <input
                                    type="range" min="80" max="120" step="1"
                                    value={rfFrequency} onChange={(e) => setRfFrequency(Number(e.target.value))}
                                    className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        )}

                        {selectedExp.controls.rfPower && (
                            <div>
                                <label className="flex justify-between text-sm mb-3 text-slate-300">
                                    <span className="font-medium">RF Power ({"$P_{RF}$"})</span>
                                    <span className="text-orange-400 font-mono bg-orange-900/30 px-2 rounded">{rfPower} %</span>
                                </label>
                                <input
                                    type="range" min="0" max="100" step="1"
                                    value={rfPower} onChange={(e) => setRfPower(Number(e.target.value))}
                                    className="w-full accent-orange-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        )}

                        {selectedExp.controls.modulation && (
                            <div className="space-y-5">
                                <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded border border-slate-700">
                                    <span className="text-sm font-medium text-slate-300">Modulation (Square/Pulse)</span>
                                    <button
                                        onClick={toggleModulation}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${modulation ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${modulation ? 'translate-x-7' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                {modulation && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="flex justify-between text-sm mb-3 text-slate-300">
                                            <span className="font-medium text-xs">Modulation Freq</span>
                                            <span className="text-blue-400 font-mono text-xs bg-blue-900/30 px-2 rounded">{modulationFreq} kHz</span>
                                        </label>
                                        <input
                                            type="range" min="1" max="100" step="0.5"
                                            value={modulationFreq} onChange={(e) => setModulationFreq(Number(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedExp.controls.beamDia && (
                            <div>
                                <label className="flex justify-between text-sm mb-3 text-slate-300">
                                    <span className="font-medium text-xs">Beam Diameter ({"$d$"})</span>
                                    <span className="text-fuchsia-400 font-mono text-xs bg-fuchsia-900/30 px-2 rounded">{beamDiameter.toFixed(1)} mm</span>
                                </label>
                                <input
                                    type="range" min="1" max="5" step="0.1"
                                    value={beamDiameter} onChange={(e) => setBeamDiameter(Number(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
                                />
                                <p className="text-[10px] text-slate-500 mt-2">Relates to rise time {"$t_r \\approx \\frac{0.64 \\cdot d}{v_a}$"}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InstrumentsOverlay = () => {
    const { activeExperiment, laserPower, laserInputPower, rfFrequency, rfPower, modulation, modulationFreq, beamDiameter } = useStore();

    // Dynamic calculations
    const angle = calculateAngle(rfFrequency);
    const mrad = (angle * 1000).toFixed(2);

    const eff = calculateEfficiency(rfPower);
    const p_total = laserInputPower; // mW
    const p_out = (eff * p_total).toFixed(1);

    // Real-time Oscilloscope Data Generation
    const [chartData, setChartData] = useState([]);

    // Base rise time in ns (e.g. 1mm -> 152ns)
    const riseTimeNs = calculateRiseTime(beamDiameter) * 1e9;

    useEffect(() => {
        // Only run oscilloscope calculation if the experiment supports modulation
        const selectedExp = EXPERIMENTS.find(e => e.id === activeExperiment) || EXPERIMENTS[0];
        if (!selectedExp.controls.modulation) return;

        let timer;
        if (laserPower && modulation) {
            let timeOffset = 0;
            timer = setInterval(() => {
                const newData = [];
                let prevLp = 0;
                // Smoothing parameter mapping riseTimeNs (150-750) to alpha (0-1)
                const alpha = Math.max(0.05, Math.min(0.9, 1 - (riseTimeNs / 1000)));

                // Generate timeframe
                const periodSamples = 100 / modulationFreq;

                for (let i = 0; i < 80; i++) {
                    const t = timeOffset + i;
                    const isHigh = (t % periodSamples) < (periodSamples / 2);
                    const inputV = isHigh ? 5 : 0;

                    // Simple low-pass RC simulation for rise/fall edges
                    const outV = prevLp + alpha * (inputV - prevLp);
                    prevLp = outV;

                    newData.push({
                        time: i,
                        Input: inputV,
                        Output: outV * 0.8 // Simulated 80% loss
                    });
                }
                setChartData([...newData]);
                timeOffset += 2; // sweep speed
            }, 50);
        } else {
            setChartData(Array.from({ length: 80 }, (_, i) => ({ time: i, Input: 0, Output: 0 })));
        }

        return () => clearInterval(timer);
    }, [activeExperiment, laserPower, modulation, modulationFreq, riseTimeNs]);

    const selectedExp = EXPERIMENTS.find(e => e.id === activeExperiment) || EXPERIMENTS[0];

    return (
        <div className="absolute top-6 right-6 w-96 flex flex-col gap-4 z-10 pointer-events-auto">
            <div className="hud-panel w-full">
                <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-4 font-bold flex items-center gap-2"><Zap size={16} className="text-yellow-400" /> Power Meter</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Laser Input</div>
                        <div className="text-2xl font-mono text-red-500">{laserPower ? p_total : 0} <span className="text-xs text-slate-400 ml-1">mW</span></div>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700 relative overflow-hidden group">
                        <div className={`absolute -inset-2 bg-green-500/20 blur-xl rounded-full transition-opacity duration-500 ${laserPower && (selectedExp.controls.rfPower || selectedExp.controls.modulation) ? 'opacity-100' : 'opacity-0'}`}></div>
                        <div className="relative z-10">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">1st Order Output</div>
                            <div className="text-2xl font-mono text-green-400">{laserPower && (selectedExp.controls.rfPower || selectedExp.controls.modulation) ? p_out : laserPower ? (p_total * 0.5).toFixed(1) : 0} <span className="text-xs text-slate-400 ml-1">mW</span></div>
                        </div>
                    </div>

                    {selectedExp.controls.rfFreq && (
                        <div className="col-span-2 bg-blue-900/20 p-3 rounded-lg border border-blue-900/50 mt-1">
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-slate-400 uppercase tracking-wider">Bragg Angle (θ)</div>
                                <div className="text-xl font-mono text-cyan-400">{mrad} <span className="text-xs text-slate-400">mrad</span></div>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${(Math.min(mrad, 30) / 30) * 100}%` }}></div>
                            </div>
                        </div>
                    )}

                    {selectedExp.controls.beamDia && (
                        <div className="col-span-2 bg-purple-900/20 p-3 rounded-lg border border-purple-900/50 mt-1">
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-slate-400 uppercase tracking-wider">Acoustic Rise Time ($t_r$)</div>
                                <div className="text-xl font-mono text-purple-400">{riseTimeNs.toFixed(1)} <span className="text-xs text-slate-400">ns</span></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedExp.controls.modulation && (
                <div className="hud-panel w-full">
                    <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2"><Activity size={16} className="text-blue-400" /> Oscilloscope</span>
                        <span className="text-[10px] bg-red-900/50 text-red-400 px-2 py-0.5 rounded animate-pulse">{modulation && laserPower ? 'LIVE' : 'STANDBY'}</span>
                    </h3>
                    <div className="h-48 w-full bg-[#050505] rounded-lg border border-slate-700 p-2 relative shadow-inner">
                        <div className="absolute inset-0 grid grid-cols-10 grid-rows-8 opacity-20 pointer-events-none p-2">
                            {Array.from({ length: 80 }).map((_, i) => <div key={i} className="border-[0.5px] border-green-500/30"></div>)}
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <Line type="step" dataKey="Input" stroke="#fbbf24" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                <Line type="monotone" dataKey="Output" stroke="#60a5fa" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                                <YAxis domain={[-1, 6]} hide />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

const LandingPage = () => {
    const { enterLab } = useStore();
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-slate-900 overflow-hidden">
            {/* Background grids & glows */}
            <div className="absolute inset-0 grid grid-cols-[repeat(40,minmax(0,1fr))] grid-rows-[repeat(40,minmax(0,1fr))] opacity-10 pointer-events-none">
                {Array.from({ length: 1600 }).map((_, i) => <div key={i} className="border-[0.5px] border-cyan-500/20"></div>)}
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-red-900/10 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-3xl px-6">
                <div className="mb-6 inline-flex items-center justify-center p-5 bg-cyan-950/40 rounded-3xl border border-cyan-800/50 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-sm">
                    <Activity size={56} className="text-cyan-400" />
                </div>

                <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 mb-6 tracking-tight drop-shadow-lg">
                    Acousto-Optic Modulator
                </h1>

                <p className="text-lg md:text-xl text-slate-300 mb-12 leading-relaxed max-w-2xl font-light">
                    Explore the principles of acousto-optic diffraction, temporal modulation, and Bragg constraints in a high-fidelity, interactive 3D laboratory environment.
                </p>

                <button
                    onClick={enterLab}
                    className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:-translate-y-1"
                >
                    <PlaySquare size={24} className="group-hover:scale-110 transition-transform" />
                    <span>Enter Laboratory</span>
                    <div className="absolute inset-0 rounded-full border border-white/20 group-hover:border-white/40 transition-colors pointer-events-none"></div>
                </button>

                <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-slate-500 font-semibold tracking-widest uppercase">
                    <span className="flex items-center gap-2"><Zap size={16} className="text-yellow-500/70" /> 20 Core Experiments</span>
                    <span className="flex items-center gap-2"><Activity size={16} className="text-green-500/70" /> Real-time Physics</span>
                    <span className="flex items-center gap-2"><Power size={16} className="text-red-500/70" /> Interactive Hardware</span>
                </div>
            </div>
        </div>
    );
};


const App = () => {
    const { activeExperiment, beamDiameter, hasEntered } = useStore();
    const selectedExp = EXPERIMENTS.find(e => e.id === activeExperiment) || EXPERIMENTS[0];
    const setupStr = selectedExp.setup.toLowerCase();

    const hasMirror = setupStr.includes('mirror');
    const hasLens = setupStr.includes('lens');
    const hasBS = setupStr.includes('interferometer') || setupStr.includes('beamsplitter');

    const pLaserOriginal = [-0.25, 0.25, 1.75];
    const pLaserStraight = [0.00, 0.25, 0.60];
    const laserPos = hasMirror ? pLaserOriginal : pLaserStraight;

    if (!hasEntered) {
        return <LandingPage />;
    }

    return (
        <>
            <Dashboard />
            <InstrumentsOverlay />

            {/* 3D Scene */}
            <Canvas camera={{ position: [5, 4, 10], fov: 45 }}>
                <color attach="background" args={['#050814']} />
                <fog attach="fog" args={['#050814', 10, 30]} />

                <ambientLight intensity={0.4} />
                <spotLight position={[0, 10, 0]} intensity={2} penumbra={1} color="#e2e8f0" castShadow />
                <directionalLight position={[-5, 5, 5]} intensity={0.8} />

                <OpticalBench />
                <CompactLaserDiode position={laserPos} />
                <FreeSpaceIsolator position={[laserPos[0] + 0.55, laserPos[1], laserPos[2]]} />

                {hasMirror && (
                    <>
                        <Mirror position={[1.0, 0.25, 1.75]} name="M1" rotY={Math.PI / 4} />
                        <Mirror position={[1.0, 0.25, 0.60]} name="M2" rotY={-Math.PI / 4} />
                    </>
                )}

                {hasLens && (
                    <>
                        <Lens position={[2.0, 0.25, 0.60]} name="L1" textY={0.4} />
                        <Lens position={[2.4, 0.25, 0.60]} name="L2" textY={0.25} />
                    </>
                )}

                {hasBS && <BeamsplitterCube />}

                <AOM3080_122 />
                <IRDetectorCard />
                <RFDriver3910 />
                <Beam />

                <OrbitControls makeDefault target={[1.5, 0.25, 1.0]} maxPolarAngle={Math.PI / 2 - 0.1} minDistance={2} maxDistance={20} />
            </Canvas>
        </>
    )
}

export default App;
