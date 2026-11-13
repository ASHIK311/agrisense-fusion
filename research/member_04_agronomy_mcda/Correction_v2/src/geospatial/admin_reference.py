import os
import sys
import json
import math
import re
import pandas as pd
from difflib import SequenceMatcher

def clean_str(s):
    if not isinstance(s, str): return ''
    return re.sub(r'[^a-z0-9]', '', s.lower().strip())

# Official Divisions Dictionary with Bengali names and BBS Division Codes
DIVISIONS_DICT = {
    'barishal': {'name': 'Barishal', 'name_bn': 'বরিশাল', 'code': '10',
                 'districts': ['barguna', 'barisal', 'bhola', 'jhalokati', 'patuakhali', 'pirojpur']},
    'chattogram': {'name': 'Chattogram', 'name_bn': 'চট্টগ্রাম', 'code': '20',
                   'districts': ['bandarban', 'brahmanbaria', 'brahamanbaria', 'chandpur', 'chittagong', 'comilla', 'coxsbazar', 'cox\'s bazar', 'feni', 'khagrachhari', 'lakshmipur', 'noakhali', 'rangamati']},
    'dhaka': {'name': 'Dhaka', 'name_bn': 'ঢাকা', 'code': '30',
              'districts': ['dhaka', 'faridpur', 'gazipur', 'gopalganj', 'kishoreganj', 'madaripur', 'manikganj', 'munshiganj', 'narayanganj', 'narsingdi', 'rajbari', 'shariatpur', 'tangail']},
    'khulna': {'name': 'Khulna', 'name_bn': 'খুলনা', 'code': '40',
               'districts': ['bagerhat', 'chuadanga', 'jessore', 'jashore', 'jhenaidah', 'khulna', 'kushtia', 'magura', 'meherpur', 'narail', 'satkhira']},
    'mymensingh': {'name': 'Mymensingh', 'name_bn': 'ময়মনসিংহ', 'code': '45',
                   'districts': ['jamalpur', 'mymensingh', 'netrokona', 'netrakona', 'sherpur']},
    'rajshahi': {'name': 'Rajshahi', 'name_bn': 'রাজশাহী', 'code': '50',
                 'districts': ['bogra', 'bogura', 'joypurhat', 'naogaon', 'nator', 'natore', 'chapai nawabganj', 'nawabganj', 'pabna', 'rajshahi', 'sirajganj']},
    'rangpur': {'name': 'Rangpur', 'name_bn': 'রংপুর', 'code': '55',
                'districts': ['dinajpur', 'gaibandha', 'kurigram', 'lalmonirhat', 'nilphamari', 'panchagarh', 'rangpur', 'thakurgaon']},
    'sylhet': {'name': 'Sylhet', 'name_bn': 'সিলেট', 'code': '60',
               'districts': ['habiganj', 'moulvibazar', 'moulvi bazar', 'sunamganj', 'sylhet']}
}

# District Normalization Map
DIST_NORM = {
    'brahmanbaria': 'brahamanbaria',
    'jhalakati': 'jhalokati',
    'moulvi bazar': 'maulvibazar',
    'moulvibazar': 'maulvibazar',
    'nator': 'natore',
    'bogra': 'bogra',
    'bogura': 'bogra',
    'chittagong': 'chittagong',
    'chattogram': 'chittagong',
    'comilla': 'comilla',
    'cumilla': 'comilla',
    'jessore': 'jessore',
    'jashore': 'jessore',
    'barisal': 'barisal',
    'barishal': 'barisal',
    'coxsbazar': 'coxsbazar',
    'cox\'s bazar': 'coxsbazar',
    'netrakona': 'netrakona'
}

# Known manual aliases for Bangladeshi Upazilas
UPAZILA_MANUAL_ALIASES = {
    ('bagerhat', 'morelganj'): 'morrelganj',
    ('barguna', 'borguna'): 'barguna sadar',
    ('barisal', 'barisal'): 'barisal sadar (kotwali)',
    ('barisal', 'ujirpur'): 'wazirpur',
    ('bhola', 'bhola'): 'bhola sadar',
    ('bhola', 'monpura'): 'manpura',
    ('bhola', 'tajumuddin'): 'tazumuddin',
    ('bogra', 'bogra'): 'bogra sadar',
    ('bogra', 'dhubchachia'): 'dhupchanchia',
    ('bogra', 'dhunot'): 'dhunat',
    ('bogra', 'kahalu'): 'kahaloo',
    ('bogra', 'shariakandi'): 'sariakandi',
    ('bogra', 'sonatala'): 'sonatola',
    ('chittagong', 'anwara'): 'anowara',
    ('chittagong', 'banskhali'): 'banshkhali',
    ('chittagong', 'lohagora'): 'lohagara',
    ('chittagong', 'patia'): 'patiya',
    ('chittagong', 'rauzan'): 'raozan',
    ('chuadanga', 'damurhuda'): 'damurhuda',
    ('comilla', 'comilla'): 'comilla sadar',
    ('comilla', 'debidwer'): 'debidwar',
    ('comilla', 'homna'): 'homna',
    ('comilla', 'monohorganj'): 'manoharganj',
    ('coxsbazar', 'coxsbazar'): 'cox\'s bazar sadar',
    ('cox\'s bazar', 'coxsbazar'): 'cox\'s bazar sadar',
    ('dhaka', 'dhakametro'): 'kotwali',
    ('dhaka', 'dhaka metro'): 'kotwali',
    ('jessore', 'jessore'): 'kotwali',
    ('kurigram', 'rajibpurdhushmara'): 'char rajibpur',
    ('kurigram', 'rajibpur (dhushmara)'): 'char rajibpur',
    ('shariatpur', 'palongsadar'): 'shariatpur sadar',
    ('shariatpur', 'palong (sadar)'): 'shariatpur sadar',
    ('dinajpur', 'dinajpur'): 'dinajpur sadar',
    ('dinajpur', 'ghoraghat'): 'ghoraghat',
    ('faridpur', 'faridpur'): 'faridpur sadar',
    ('feni', 'feni'): 'feni sadar',
    ('feni', 'sonagazi'): 'sonagazi',
    ('gaibandha', 'gaibandha'): 'gaibandha sadar',
    ('gaibandha', 'gobindaganj'): 'gobindaganj',
    ('gazipur', 'gazipur'): 'gazipur sadar',
    ('gopalganj', 'gopalganj'): 'gopalganj sadar',
    ('habiganj', 'habiganj'): 'habiganj sadar',
    ('jamalpur', 'jamalpur'): 'jamalpur sadar',
    ('jessore', 'jessore'): 'kotwali',
    ('jhenaidah', 'jhenaidah'): 'jhenaidah sadar',
    ('jhalakati', 'jhalakati'): 'jhalokati sadar',
    ('joypurhat', 'joypurhat'): 'joypurhat sadar',
    ('khagrachhari', 'khagrachhari'): 'khagrachhari sadar',
    ('khulna', 'khulna metro'): 'khulna sadar',
    ('khulna', 'dighalia (daulathpur)'): 'dighalia',
    ('kishoreganj', 'kishoreganj'): 'kishoreganj sadar',
    ('kurigram', 'kurigram'): 'kurigram sadar',
    ('kurigram', 'rajibpur (dhushmara)'): 'char rajibpur',
    ('kushtia', 'kushtia'): 'kushtia sadar',
    ('lakshmipur', 'lakshmipur'): 'lakshmipur sadar',
    ('lakshmipur', 'raipur'): 'roypur',
    ('lalmonirhat', 'lalmonirhat'): 'lalmonirhat sadar',
    ('madaripur', 'madaripur'): 'madaripur sadar',
    ('magura', 'magura'): 'magura sadar',
    ('manikganj', 'manikganj'): 'manikganj sadar',
    ('meherpur', 'meherpur'): 'meherpur sadar',
    ('moulvibazar', 'moulvibazar'): 'maulvibazar sadar',
    ('moulvi bazar', 'moulvi bazar'): 'maulvibazar sadar',
    ('munshiganj', 'munshiganj'): 'munshiganj sadar',
    ('mymensingh', 'mymensingh'): 'mymensingh sadar',
    ('naogaon', 'naogaon'): 'naogaon sadar',
    ('narail', 'narail'): 'narail sadar',
    ('narayanganj', 'narayanganj'): 'narayanganj sadar',
    ('narsingdi', 'narsingdi'): 'narsingdi sadar',
    ('nator', 'nator'): 'natore sadar',
    ('natore', 'natore'): 'natore sadar',
    ('nawabganj', 'nawabganj'): 'nawabganj sadar',
    ('chapai nawabganj', 'chapai nawabganj'): 'nawabganj sadar',
    ('netrakona', 'netrakona'): 'netrokona sadar',
    ('nilphamari', 'nilphamari'): 'nilphamari sadar',
    ('noakhali', 'noakhali'): 'noakhali sadar (sudharam)',
    ('pabna', 'pabna'): 'pabna sadar',
    ('panchagarh', 'panchagarh'): 'panchagarh sadar',
    ('patuakhali', 'patuakhali'): 'patuakhali sadar',
    ('pirojpur', 'pirojpur'): 'pirojpur sadar',
    ('pirojpur', 'sarupkati'): 'nesarabad (swarupkati)',
    ('rajbari', 'rajbari'): 'rajbari sadar',
    ('rajshahi', 'boalia (rajshahi)'): 'boalia',
    ('rangamati', 'rangamati'): 'rangamati sadar',
    ('rangpur', 'rangpur'): 'rangpur sadar',
    ('satkhira', 'satkhira'): 'satkhira sadar',
    ('shariatpur', 'shariatpur'): 'shariatpur sadar',
    ('shariatpur', 'palong (sadar)'): 'shariatpur sadar',
    ('sherpur', 'sherpur'): 'sherpur sadar',
    ('sirajganj', 'sirajganj'): 'sirajganj sadar',
    ('sunamganj', 'sunamganj'): 'sunamganj sadar',
    ('sylhet', 'sylhet'): 'sylhet sadar',
    ('tangail', 'tangail'): 'tangail sadar',
    ('thakurgaon', 'thakurgaon'): 'thakurgaon sadar'
}

def latlon_to_utm45n(lat, lon):
    a = 6378137.0
    f = 1 / 298.257223563
    e2 = 2 * f - f * f
    e_prime2 = e2 / (1 - e2)
    lon0 = 87.0 * math.pi / 180.0
    k0 = 0.9996
    phi = lat * math.pi / 180.0
    lam = lon * math.pi / 180.0
    N = a / math.sqrt(1 - e2 * math.sin(phi)**2)
    T = math.tan(phi)**2
    C = e_prime2 * math.cos(phi)**2
    A = math.cos(phi) * (lam - lon0)
    M = a * ((1 - e2/4 - 3*e2**2/64 - 5*e2**3/256) * phi
             - (3*e2/8 + 3*e2**2/32 + 45*e2**3/1024) * math.sin(2*phi)
             + (15*e2**2/256 + 45*e2**3/1024) * math.sin(4*phi)
             - (35*e2**3/3072) * math.sin(6*phi))
    easting = 500000.0 + k0 * N * (A + (1 - T + C) * A**3 / 6 + (5 - 18*T + T**2 + 72*C - 58*e_prime2) * A**5 / 120)
    northing = k0 * (M + N * math.tan(phi) * (A**2 / 2 + (5 - T + 9*C + 4*C**2) * A**4 / 24 + (61 - 58*T + T**2 + 600*C - 330*e_prime2) * A**6 / 720))
    return round(easting, 2), round(northing, 2)

def extract_coords(geom):
    coords = geom.get('coordinates', [])
    pts = []
    def recurse(c):
        if len(c) > 0 and isinstance(c[0], (int, float)):
            pts.append((c[0], c[1]))
        elif len(c) > 0 and isinstance(c[0], list):
            for sub in c:
                recurse(sub)
    recurse(coords)
    if not pts:
        return 0.0, 0.0
    lon = sum(p[0] for p in pts) / len(pts)
    lat = sum(p[1] for p in pts) / len(pts)
    return lon, lat

def point_in_polygon(x, y, poly_rings):
    # Standard ray casting
    inside = False
    for ring in poly_rings:
        n = len(ring)
        if n < 3: continue
        p1x, p1y = ring[0]
        for i in range(n + 1):
            p2x, p2y = ring[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
    return inside

def get_division_info(district_name):
    d_clean = clean_str(district_name)
    d_clean = DIST_NORM.get(d_clean, d_clean)
    for div_key, div_data in DIVISIONS_DICT.items():
        if d_clean in div_data['districts']:
            return div_data['name'], div_data['name_bn'], div_data['code']
    return 'Rajshahi', 'রাজশাহী', '50' # Default fallback
