/**
 * AgriSense Fusion — Field Shift Track · NASA Space Apps Challenge 2026
 * Official Team Roster & Contact Directory
 * Region: Dhaka | Team Size: 6 Members
 * Repository: https://github.com/ASHIK311/agrisense-fusion
 */

export const TEAM_INFO = {
  challenge: 'NASA Space Apps Challenge 2026',
  track: 'Field Shift Track',
  project: 'AgriSense Fusion',
  region: 'Dhaka, Bangladesh',
  teamSize: 6,
  githubRepoUrl: 'https://github.com/ASHIK311/agrisense-fusion',
  nasaShowcaseUrl: 'https://www.spaceappschallenge.org/',
  primaryLocation: 'Godagari Upazila, Rajshahi (AEZ-26 High Barind Tract, 24.4690°N, 88.3300°E)',
};

export const TEAM_LEADER = {
  id: 'leader',
  memberNo: 'Team Leader',
  name: 'Nakib Md Ashik',
  role: 'Team Lead & System Architect',
  region: 'Dhaka',
  phone: '01771449164',
  email: 'ashiknakib25@gmail.com',
  github: 'https://github.com/ASHIK311',
  image: '/team/nakib-md-ashik.png',
  badge: 'Leadership & Architecture',
  skills: ['System Architecture', 'Geospatial AI', 'Full-Stack Integration', 'NASA Space Apps Lead'],
  bio: 'Leading AgriSense Fusion end-to-end architecture, coordinating multiscale fusion between Copernicus Sentinel-2, vadose zone hydrology, and IoT telemetry.',
};

export const TEAM_MEMBERS = [
  {
    id: 'member-01',
    memberNo: 'Member 01',
    name: 'Shah Ismat Mahmud Tanim',
    role: 'Research, Scientific Evidence & Operations',
    region: 'Dhaka',
    phone: '01714297932',
    email: 'tanim2001429@gmail.com',
    image: '/team/shah-ismat-mahmud-tanim.png',
    badge: 'Agronomic Research',
    skills: ['Scientific Literature', 'Pathology KB', 'Forensic Audit', '60 Verified DOIs'],
    bio: 'Compiled 60 verified scientific DOI citations and curated 17 Bangladesh-specific crop disease rules for evidence-grounded plant pathology.',
  },
  {
    id: 'member-02',
    memberNo: 'Member 02',
    name: 'Md. Riazul Islam Tusar',
    role: 'Full-Stack Backend & API Integration',
    region: 'Dhaka',
    phone: '01780841502',
    email: 'theriazul.info@gmail.com',
    image: '/team/md-riazul-islam-tusar.png',
    badge: 'Backend Architecture',
    skills: ['FastAPI & Node.js', 'REST Endpoints', 'Data Persistence', 'Telemetry Pipeline'],
    bio: 'Engineered backend microservices, SQLite persistence, and high-throughput telemetry APIs for field parcel monitoring and NASA data syncing.',
  },
  {
    id: 'member-03',
    memberNo: 'Member 03',
    name: 'Mynuddin Ahmed',
    role: 'Frontend & Geospatial UI/UX Designer',
    region: 'Dhaka',
    phone: '01643897205',
    email: 'mayanahmedopu@gmail.com',
    image: '/team/mynuddin-ahmed.png',
    badge: 'Geospatial UI/UX',
    skills: ['Three.js 3D Twins', 'Tailwind & Modern CSS', 'GIS Mapping', 'Interactive HUD'],
    bio: 'Crafted the 3D stratigraphic digital twin, daylight botanical design system, responsive glassmorphic cards, and spatial GIS HUD interfaces.',
  },
  {
    id: 'member-04',
    memberNo: 'Member 04',
    name: 'Tanvir Kabir',
    role: 'IoT & ESP32 Hardware Telemetry Engineer',
    region: 'Dhaka',
    phone: '01647479598',
    email: 'tanvirkabir908@gmail.com',
    image: '/team/tanvir-kabir.png',
    badge: 'Hardware & IoT',
    skills: ['ESP32 Microcontrollers', 'FDR v2 Soil Sensors', 'Firmware (C++)', 'Edge Calibration'],
    bio: 'Designed and calibrated FDR soil moisture prototypes, edge telemetry interfaces, and hardware communication for real-time field readings.',
  },
  {
    id: 'member-05',
    memberNo: 'Member 05',
    name: 'Md Mizanur Rahman',
    role: 'Vadose Hydrology & Soil Physics Engineer',
    region: 'Dhaka',
    phone: '01301750808',
    email: 'mmdmizan873@gmail.com',
    image: '/team/md-mizanur-rahman.png',
    badge: 'Soil Hydrology',
    skills: ['FAO-56 Dual Kc', 'Water Balance Physics', 'Soil Moisture Profiles', 'Data Science'],
    bio: 'Formulated daily evapotranspiration and root-zone depletion algorithms benchmarked against FAO-56 and BARC AEZ-26 soil standards.',
  },
];

export const ALL_TEAM = [TEAM_LEADER, ...TEAM_MEMBERS];
