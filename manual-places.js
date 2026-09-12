/*
 * Manually-verified supplementary places for categories OpenStreetMap has not
 * fully mapped in Amravati yet. Verified via Google Maps on 2026-09-03.
 *
 * These are merged into the normal OSM-sourced places for their category
 * after the Overpass fetch completes (see mergeManualPlaces in app.js), and
 * are rendered with the exact same pin, popup, panel-card and route
 * behavior as every other place — nothing special-cased in the UI layer.
 */
const MANUAL_PLACES = {
  ev_charging: [
    { name: "Tata Power Charging Station", lat: 20.8926364, lon: 77.7468881 },
    { name: "Nikol EV Charging Station", lat: 20.9904966, lon: 77.8003444 },
    { name: "Tata Power Charging Station (Borgaon Dharmale)", lat: 20.991087, lon: 77.797159 },
    { name: "Kia Charging Station", lat: 20.8857265, lon: 77.7456792 },
    { name: "Electric Vehicle Charging Station (Congress Nagar Rd)", lat: 20.9287834, lon: 77.7585356 },
    { name: "Tryk Charge Charging Station", lat: 20.9348449, lon: 77.7673542 },
    { name: "Ather Grid Charging Station (Saturna)", lat: 20.9056385, lon: 77.7467771 },
    { name: "Ather Grid Charging Station (Navathe Nagar)", lat: 20.908092, lon: 77.75307 },
    { name: "Electric Vehicle Charging Station (Badnera Rd)", lat: 20.8574246, lon: 77.7484267 },
    { name: "CELECTRIC EV Charging Station", lat: 20.9093471, lon: 77.7518709 },
  ],
  hardware: [
    { name: "Hardware House", lat: 20.933187, lon: 77.75006 },
    { name: "Hare Murari Electricals & Hardware", lat: 20.973308, lon: 77.7557582 },
    { name: "Raj Hardware & Electricals", lat: 20.9294897, lon: 77.7625949 },
    { name: "The National Hardware and Plylam", lat: 20.9389033, lon: 77.7574569 },
    { name: "Agrawal Hardware Stores", lat: 20.934458, lon: 77.7523062 },
    { name: "Mantri Hardware", lat: 20.8949259, lon: 77.7324775 },
    { name: "Shetkari Hardware", lat: 20.9344136, lon: 77.7552836 },
    { name: "Swaraj Hardware & Plywood", lat: 20.9611331, lon: 77.7566812 },
    { name: "Hakimi Hardware / Traders", lat: 20.9339761, lon: 77.7527855 },
    { name: "Suvidha Hardware", lat: 20.9609794, lon: 77.7524783 },
  ],
  gyms: [
    { name: "Source of Fitness", lat: 20.9282065, lon: 77.7499484 },
    { name: "Raw Fitness Gym", lat: 20.9468638, lon: 77.7587039 },
    { name: "Strength Factory", lat: 20.9610573, lon: 77.7513076 },
    { name: "Welliesta Fitness", lat: 20.8953918, lon: 77.7444605 },
    { name: "Fusion Fitness by Neetu Jangid", lat: 20.9120167, lon: 77.7403555 },
    { name: "AMB Fitness Club", lat: 20.9314263, lon: 77.7803981 },
    { name: "Body Factory Fitness & Wellness Club", lat: 20.9435789, lon: 77.7699435 },
    { name: "Cactus Fitness", lat: 20.91341, lon: 77.7401658 },
    { name: "Kometa The Gym", lat: 20.9710988, lon: 77.7563932 },
    { name: "PSD Fitness Club Gym", lat: 20.9629867, lon: 77.7759967 },
  ],
  cinemas: [
    { name: "Miraj Cinemas", lat: 20.8999938, lon: 77.7481926 },
    { name: "E-Orbit Multiplex & Gaming Zone", lat: 20.8983203, lon: 77.7477041 },
    { name: "Rajlaxmi Cinema", lat: 20.9286764, lon: 77.7533304 },
    { name: "Saroj Talkies", lat: 20.9315239, lon: 77.753045 },
  ],
  fire: [
    { name: "Fire Station (Wahdat Nagar)", lat: 20.9474239, lon: 77.7427209 },
    { name: "Amravati Municipal Corporation's Fire Station", lat: 20.9345764, lon: 77.7576175 },
    { name: "Fire Station (AMC, Badnera)", lat: 20.877585, lon: 77.7424302 },
  ],
  churches: [
    { name: "St. Francis Xavier's Cathedral", lat: 20.9330073, lon: 77.7652886 },
    { name: "Christian & Missionary Alliance Church", lat: 20.9272365, lon: 77.7540636 },
    { name: "St. Thomas Church", lat: 20.9413606, lon: 77.779786 },
    { name: "Church (Maltekdi)", lat: 20.9279601, lon: 77.7757056 },
  ],
  libraries: [
    { name: "StudyNest Library", lat: 20.9618355, lon: 77.7566343 },
    { name: "Zenclave Library Sainagar", lat: 20.8952956, lon: 77.7476945 },
    { name: "Sunbless Library", lat: 20.9474078, lon: 77.7652982 },
    { name: "ShrinathJi Library & Reading Room", lat: 20.9137232, lon: 77.7443592 },
    { name: "Aajol Library", lat: 20.9476179, lon: 77.7650019 },
  ],
  courts: [
    { name: "District & Sessions Court, Amravati", lat: 20.9367919, lon: 77.7776597 },
    { name: "Family Court Amravati", lat: 20.9373752, lon: 77.7774121 },
    { name: "Dotiwala Court", lat: 20.9374288, lon: 77.7798325 },
  ],
  parking: [
    { name: "Ambadevi Temple Parking", lat: 20.9281171, lon: 77.7495079 },
    { name: "D Mart Motorcycle Parking", lat: 20.8982163, lon: 77.7479314 },
    { name: "Pay & Park - Car & Bike Parking", lat: 20.8565567, lon: 77.7307599 },
    { name: "Parking Zone", lat: 20.9292283, lon: 77.7549583 },
  ],
  bakeries: [
    { name: "Chandekar Bakery", lat: 20.9452767, lon: 77.7668752 },
    { name: "Bhavnas Cakes and Bakery", lat: 20.9500197, lon: 77.7660228 },
    { name: "Desserts & More Cafe by Nemani's", lat: 20.9372982, lon: 77.7564439 },
    { name: "Cream Corner", lat: 20.961139, lon: 77.767507 },
    { name: "Orchid Bakery", lat: 20.9677799, lon: 77.7560857 },
  ],
  clothing: [
    { name: "Aradhana Fashions", lat: 20.9310913, lon: 77.753833 },
    { name: "TRENDS (Tapadia City Center)", lat: 20.9000075, lon: 77.7483116 },
    { name: "Busyland Aradhana Wholesale Shopping Mall", lat: 21.0037651, lon: 77.8122568 },
    { name: "TRENDS (Tahasil Rd)", lat: 20.9305605, lon: 77.7516967 },
    { name: "Shraddha Mall Busyland", lat: 21.0041071, lon: 77.8130179 },
  ],
  electronics: [
    { name: "Modern Electronic Mall", lat: 20.9269332, lon: 77.7646113 },
    { name: "Modern Trading Center", lat: 20.9287406, lon: 77.7565101 },
    { name: "Kedia Traders", lat: 20.9340066, lon: 77.7592667 },
    { name: "Doordarshan Electronics", lat: 20.9289577, lon: 77.7583513 },
    { name: "Croma - Amravati", lat: 20.907373, lon: 77.7512035 },
  ],
  venues: [
    { name: "Shubharambh Lawn", lat: 20.9774047, lon: 77.7775215 },
    { name: "Swagat Lawn", lat: 20.9765095, lon: 77.7945775 },
    { name: "Mahendra Lawn", lat: 20.9043249, lon: 77.750277 },
    { name: "Jawarkar Marriage Hall & Lawn", lat: 20.9698738, lon: 77.7721561 },
    { name: "Muktai Palace", lat: 20.9759127, lon: 77.7708301 },
  ],
};
