let fiches = [];
let filteredFiches = [];
let currentFilter = 'all';
let currentPage = 0;
let useFirebase = false;
let useGoogleDrive = false;
let googleDriveToken = null;

const colors = {
  'reglement': '#0052A5',
  'reforme': '#D97706',
  'loi': '#DC2626',
  'plan-crac': '#059669',
  'plan-oxygene': '#7C3AED',
  'plans-divers': '#EA580C',
  'suivi': '#0891B2'
};

const typeLabels = {
  'reglement': 'Règlement',
  'reforme': 'Réforme',
  'loi': 'Loi',
  'plan-crac': 'Plan CRAC',
  'plan-oxygene': 'Plan Oxygène',
  'plans-divers': 'Plans divers',
  'suivi': 'Commune / Entreprise en suivi'
};

document.addEventListener('DOMContentLoaded', init);

// ========== PIN LOGIN ==========
function getPinCode() {
  return localStorage.getItem('slfp_pin') || '1234';
}
function getValidPins() {
  const pins = JSON.parse(localStorage.getItem('slfp_pins') || '[]');
  return [getPinCode(), ...pins.map(p => p.code)];
}
let isPrivate = false;
const isMobile = window.innerWidth <= 480;

function initPinModal() {
  if (sessionStorage.getItem('slfp_auth')) {
    isPrivate = true;
    onPrivateMode();
  }

  const overlay = document.getElementById('pinOverlay');
  const digits = document.querySelectorAll('#pinInputs .pin-digit');
  const errorEl = document.getElementById('pinError');
  const loginActions = document.getElementById('pinLoginActions');
  const changeSection = document.getElementById('pinChangeSection');
  const requestSection = document.getElementById('pinRequestSection');

  // Open PIN modal
  document.getElementById('privateBtn').addEventListener('click', () => {
    if (isPrivate) {
      isPrivate = false;
      sessionStorage.removeItem('slfp_auth');
      onPublicMode();
    } else {
      showSection('login');
      overlay.classList.add('active');
      digits[0].focus();
    }
  });

  // Close PIN modal
  document.getElementById('pinCancel').addEventListener('click', () => {
    overlay.classList.remove('active');
    digits.forEach(d => d.value = '');
    errorEl.textContent = '';
  });

  // Submit PIN
  document.getElementById('pinSubmit').addEventListener('click', checkPin);

  // PIN digits auto-advance
  digits.forEach((input, i) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val;
      if (val && i < digits.length - 1) digits[i + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) digits[i - 1].focus();
      if (e.key === 'Enter') checkPin();
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, 4);
      text.split('').forEach((ch, j) => { if (digits[j]) digits[j].value = ch; });
      if (text.length > 0) digits[Math.min(text.length, 3)].focus();
    });
  });

  // Change PIN section
  document.getElementById('pinChangeBtn').addEventListener('click', () => {
    showSection('change');
  });

  document.getElementById('pinCancelChange').addEventListener('click', () => {
    showSection('login');
  });

  document.getElementById('pinSaveBtn').addEventListener('click', () => {
    const newDigits = document.querySelectorAll('#newPinInputs .new-pin-digit');
    const code = Array.from(newDigits).map(d => d.value).join('');
    if (code.length !== 4) {
      errorEl.textContent = 'Code incomplet';
      return;
    }
    localStorage.setItem('slfp_pin', code);
    newDigits.forEach(d => d.value = '');
    errorEl.textContent = 'Code enregistré !';
    errorEl.style.color = '#22c55e';
    setTimeout(() => { errorEl.textContent = ''; errorEl.style.color = ''; }, 2000);
    showSection('login');
  });

  // New PIN digits auto-advance
  document.querySelectorAll('#newPinInputs .new-pin-digit').forEach((input, i, arr) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val;
      if (val && i < arr.length - 1) arr[i + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) arr[i - 1].focus();
      if (e.key === 'Enter') document.getElementById('pinSaveBtn').click();
    });
  });

  // Request access section
  document.getElementById('pinRequestBtn').addEventListener('click', () => {
    showSection('request');
  });

  document.getElementById('requestCancel').addEventListener('click', () => {
    showSection('login');
  });

  document.getElementById('requestSubmit').addEventListener('click', () => {
    const name = document.getElementById('requestName').value.trim();
    const email = document.getElementById('requestEmail').value.trim();
    const message = document.getElementById('requestMessage').value.trim();
    const resultEl = document.getElementById('requestResult');

    if (!name || !email) {
      resultEl.textContent = 'Nom et email requis';
      resultEl.style.color = '';
      return;
    }

    const requests = JSON.parse(localStorage.getItem('slfp_pin_requests') || '[]');
    requests.push({
      name, email, message,
      date: new Date().toISOString()
    });
    localStorage.setItem('slfp_pin_requests', JSON.stringify(requests));

    resultEl.textContent = 'Demande envoyée !';
    resultEl.style.color = '#22c55e';
    document.getElementById('requestName').value = '';
    document.getElementById('requestEmail').value = '';
    document.getElementById('requestMessage').value = '';
    setTimeout(() => { resultEl.textContent = ''; }, 3000);
  });

  function showSection(section) {
    loginActions.style.display = section === 'login' ? '' : 'none';
    changeSection.style.display = section === 'change' ? '' : 'none';
    requestSection.style.display = section === 'request' ? '' : 'none';
    errorEl.textContent = '';
    errorEl.style.color = '';
    digits.forEach(d => d.value = '');
  }

  function checkPin() {
    const code = Array.from(digits).map(d => d.value).join('');
    const validCodes = getValidPins();
    if (validCodes.includes(code)) {
      sessionStorage.setItem('slfp_auth', '1');
      sessionStorage.setItem('slfp_auth_pin', code);
      isPrivate = true;
      overlay.classList.remove('active');
      digits.forEach(d => d.value = '');
      errorEl.textContent = '';
      onPrivateMode();
    } else {
      errorEl.textContent = 'Code incorrect';
      errorEl.style.color = '';
      digits.forEach(d => { d.value = ''; d.classList.add('error'); });
      setTimeout(() => digits.forEach(d => d.classList.remove('error')), 400);
      digits[0].focus();
    }
  }
}

function onPrivateMode() {
  const btn = document.getElementById('privateBtn');
  btn.classList.add('active-private');
  btn.title = 'Quitter l\'espace privé';
  document.getElementById('adminBtn').style.display = '';
  document.getElementById('roiButtons').classList.add('visible');
  updateRoiLogos();
  renderCards();
  renderAdminList();
}

function onPublicMode() {
  const btn = document.getElementById('privateBtn');
  btn.classList.remove('active-private');
  btn.title = 'Espace privé';
  document.getElementById('adminBtn').style.display = 'none';
  document.getElementById('roiButtons').classList.remove('visible');
  renderCards();
}

function updateRoiButtons() {
  var container = document.getElementById('roiButtons');
  var suiviFiches = fiches.filter(function(f) { return f.type === 'suivi'; });
  
  container.innerHTML = suiviFiches.map(function(f) {
    var hasLogo = f.logo && f.logo.trim() !== '';
    var label = f.societe || f.titre || 'Fiche';
    return '<button class="roi-btn" data-id="' + f.id + '" title="' + label.replace(/"/g, '&quot;') + '" onclick="openCompanyFiche(\'' + f.id + '\')">' +
      (hasLogo ? '<img class="roi-btn-logo" src="' + f.logo.replace(/"/g, '&quot;') + '" alt="' + label.replace(/"/g, '&quot;') + '">' : '') +
      '<span class="roi-btn-label"' + (hasLogo ? ' style="display:none"' : '') + '>' + label + '</span>' +
      '</button>';
  }).join('');
}

function updateRoiLogos() {
  updateRoiButtons();
}

document.addEventListener('DOMContentLoaded', init);

// ========== OLD INIT ==========

function init() {
  // Vérifier si Firebase est configuré
  try {
    if (typeof firebase !== 'undefined' && firebaseConfig && firebaseConfig.apiKey !== 'VOTRE_API_KEY') {
      useFirebase = true;
      console.log('Firebase connecté');
      loadFichesFromFirebase();
    } else {
      console.log('Firebase non configuré, mode local');
      loadFiches();
    }
  } catch (error) {
    console.error('Erreur Firebase:', error);
    useFirebase = false;
    loadFiches();
  }
  
  // Vérifier si Google Drive est configuré
  if (googleDriveConfig && googleDriveConfig.clientId !== 'VOTRE_CLIENT_ID.apps.googleusercontent.com') {
    useGoogleDrive = true;
    initGoogleDrive();
  }
  
  setupEventListeners();
  initPinModal();
}

function updateCloudStatus() {
  // Cloud status no longer displayed (buttons are in admin header)
}

// ========== GOOGLE DRIVE FUNCTIONS ==========

function initGoogleDrive() {
  gapi.load('picker', onGapiLoad);
}

function onGapiLoad() {
  console.log('Google API chargée');
}

function openGoogleDrivePicker() {
  if (!useGoogleDrive) {
    showNotification('Google Drive non configuré');
    return;
  }

  // Vérifier si l'utilisateur est connecté
  if (!googleDriveToken) {
    connectGoogleDrive();
    return;
  }

  createPicker();
}

function connectGoogleDrive() {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: googleDriveConfig.clientId,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    callback: (tokenResponse) => {
      googleDriveToken = tokenResponse.access_token;
      createPicker();
    },
    error_callback: (err) => {
      console.error('Erreur authentification Google:', err);
      showNotification('Erreur d\'authentification Google Drive');
    }
  });
  
  tokenClient.requestAccessToken();
}

function createPicker() {
  const docsView = new google.picker.DocsView()
    .setIncludeFolders(true)
    .setMimeTypes('application/pdf');
    
  const picker = new google.picker.PickerBuilder()
    .setTitle('Sélectionner un document PDF')
    .addView(docsView)
    .setOAuthToken(googleDriveToken)
    .setDeveloperKey(googleDriveConfig.apiKey)
    .setCallback(googleDrivePickerCallback)
    .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
    .build();
    
  picker.setVisible(true);
}

function googleDrivePickerCallback(data) {
  if (data.action === google.picker.Action.PICKED) {
    const file = data.docs[0];
    
    // Récupérer les informations du fichier
    const fileInfo = {
      id: file.id,
      name: file.name,
      url: file.url,
      mimeType: file.mimeType,
      downloadUrl: file.downloadUrl
    };
    
    // Télécharger le contenu du fichier
    downloadGoogleDriveFile(fileInfo);
  }
}

async function downloadGoogleDriveFile(fileInfo) {
  try {
    // Utiliser l'URL de téléchargement direct
    const downloadUrl = fileInfo.downloadUrl || 
      `https://www.googleapis.com/drive/v3/files/${fileInfo.id}?alt=media`;
    
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${googleDriveToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors du téléchargement');
    }
    
    const blob = await response.blob();
    const reader = new FileReader();
    
    reader.onload = function(event) {
      // Mettre à jour l'interface
      document.getElementById('pdfInfo').innerHTML = `
        <div class="pdf-current">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span>${fileInfo.name}</span>
          <button type="button" class="remove-pdf-btn" onclick="removePDF()">×</button>
        </div>
      `;
      
      // Stocker les données
      window.googleDriveFileData = {
        data: event.target.result,
        name: fileInfo.name
      };
      
      document.getElementById('removePdfFlag').value = 'false';
      showNotification(`Fichier "${fileInfo.name}" sélectionné`);
    };
    
    reader.readAsDataURL(blob);
    
  } catch (error) {
    console.error('Erreur téléchargement Google Drive:', error);
    showNotification('Erreur lors du téléchargement du fichier');
  }
}

// ========== FIREBASE FUNCTIONS ==========

async function loadFichesFromFirebase() {
  try {
    const snapshot = await fichesRef.orderBy('dateMiseAJour', 'desc').get();
    if (snapshot.empty) {
      // Première connexion, ajouter les fiches d'exemple
      const sampleFiches = getSampleFiches();
      for (const fiche of sampleFiches) {
        await fichesRef.doc(fiche.id).set(fiche);
      }
      fiches = sampleFiches;
    } else {
      fiches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ensure company fiches exist (check by id, not societe — user may rename)
      var companyIds = ['7', '8', '9'];
      for (var ci = 0; ci < companyIds.length; ci++) {
        if (!fiches.find(function(f) { return f.id === companyIds[ci]; })) {
          var sampleF = getSampleFiches().find(function(sf) { return sf.id === companyIds[ci]; });
          if (sampleF) {
            await fichesRef.doc(sampleF.id).set(sampleF);
            fiches.push(sampleF);
          }
        }
      }
      // Add structured infos to all fiches if missing
      var fbCompanyInfos = getCompanyInfos();
      var fbSampleInfos = getSampleInfos();
      fiches.forEach(function(f) {
        if (f.infos == null) {
          if (fbCompanyInfos[f.id]) {
            f.infos = JSON.parse(JSON.stringify(fbCompanyInfos[f.id]));
            fichesRef.doc(f.id).set(f);
          } else if (fbSampleInfos[f.id]) {
            f.infos = JSON.parse(JSON.stringify(fbSampleInfos[f.id]));
            fichesRef.doc(f.id).set(f);
          }
        }
        if (f.googleDriveLink && (!f.externalDocs || f.externalDocs.length === 0)) {
          if (!f.externalDocs) f.externalDocs = [];
          f.externalDocs.push({ nom: f.googleDriveLinkNom || 'Document PDF', url: f.googleDriveLink });
          fichesRef.doc(f.id).set(f);
        }
        // Migration contenu fiche pension (id:2) vers version belge
        if (f.id === '2' && f.contenu && f.contenu.indexOf('Arizona') === -1) {
          var fbPensionSample = getSampleFiches().find(function(sf) { return sf.id === '2'; });
          if (fbPensionSample) { f.contenu = fbPensionSample.contenu; fichesRef.doc(f.id).set(f); }
        }
        if (f.liens == null) { f.liens = []; fichesRef.doc(f.id).set(f); }
        if (f.priority == null) { f.priority = 999; fichesRef.doc(f.id).set(f); }
      });
    }
    // Sync localStorage with Firebase data
    saveFiches();
    filteredFiches = getHomeFiches();
    updateRoiLogos();
    renderCards();
    renderAdminList();
    updateCloudStatus();
    console.log('Firebase: ' + fiches.length + ' fiches chargées');
  } catch (error) {
    console.error('Erreur Firebase:', error);
    useFirebase = false;
    loadFiches();
    updateCloudStatus();
  }
}

async function saveFicheToFirebase(ficheData) {
  try {
    var clean = JSON.parse(JSON.stringify(ficheData));
    await fichesRef.doc(clean.id).set(clean);
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde Firebase:', error);
    return false;
  }
}

async function deleteFicheFromFirebase(id) {
  try {
    await fichesRef.doc(id).delete();
    return true;
  } catch (error) {
    console.error('Erreur suppression:', error);
    showNotification('Erreur de suppression');
    return false;
  }
}

async function uploadPDFToFirebase(file, ficheId) {
  try {
    const fileName = `pdfs/${ficheId}_${file.name}`;
    const ref = storage.ref(fileName);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    return { url, name: file.name };
  } catch (error) {
    console.error('Erreur upload PDF:', error);
    showNotification('Erreur lors de l\'upload du PDF');
    return null;
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('dismiss');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ========== LOCAL STORAGE FUNCTIONS ==========

function loadFiches() {
  try {
    const saved = localStorage.getItem('slfp_fiches');
    if (saved) {
      var parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        fiches = parsed;
      } else {
        throw new Error('Invalid fiches data in localStorage');
      }
    } else {
      throw new Error('No saved data');
    }
  } catch (e) {
    console.warn('loadFiches: ' + e.message + ', loading from sample');
    fiches = getSampleFiches();
    saveFiches();
  }

  // Only migrate missing fields, never overwrite existing data
  var companyDefaults = { TIBI: { logo: 'tibi.png' }, BEP: { logo: 'bep.png' }, IGRETEC: { logo: 'IGRETEC.png' } };
  var companyInfos = getCompanyInfos();
  var sampleInfos = getSampleInfos();
  fiches.forEach(function(f) {
    if (companyDefaults[f.societe]) {
      if (f.type == null) f.type = 'suivi';
      if (f.couleur == null) f.couleur = '#0891B2';
      if (f.logo == null || f.logo === '') f.logo = companyDefaults[f.societe].logo;
    }
    if (f.type === 'suivi') {
      if (f.cppt == null) f.cppt = { reunions: [] };
      if (f.qualiteBatiments == null) f.qualiteBatiments = { visites: [] };
      if (f.spfBienEtre == null) f.spfBienEtre = { inspections: [] };
      if (f.infos == null && companyInfos[f.id]) {
        f.infos = JSON.parse(JSON.stringify(companyInfos[f.id]));
      }
    }
    // Add structured infos for all sample fiches
    if (f.infos == null && sampleInfos[f.id]) {
      f.infos = JSON.parse(JSON.stringify(sampleInfos[f.id]));
    }
    // Migrate old googleDriveLink to externalDocs array
    if (f.googleDriveLink && (!f.externalDocs || f.externalDocs.length === 0)) {
      if (!f.externalDocs) f.externalDocs = [];
      f.externalDocs.push({ nom: f.googleDriveLinkNom || 'Document PDF', url: f.googleDriveLink });
    }
    // Migration contenu fiche pension (id:2) vers version belge
    if (f.id === '2' && f.contenu && f.contenu.indexOf('Arizona') === -1) {
      var pensionSample = getSampleFiches().find(function(sf) { return sf.id === '2'; });
      if (pensionSample) f.contenu = pensionSample.contenu;
    }
    // Initialiser le champ liens si absent
    if (f.liens == null) f.liens = [];
    // Initialiser le champ externalDocs si absent
    if (f.externalDocs == null) f.externalDocs = [];
    // Initialiser le champ priority si absent
    if (f.priority == null) f.priority = 999;
  });
  saveFiches();
  filteredFiches = getHomeFiches();
  renderCards();
  renderAdminList();
  updateRoiLogos();
}

function getCompanyInfos() {
  return {
    '7': {
      nom: 'TIBI',
      statutJuridique: 'Intercommunale de gestion intégrée des déchets',
      formeJuridique: 'Association intercommunale à but social',
      siegeSocial: 'Couillet (Charleroi), Belgique',
      dateCreation: '2018 (changement de nom, activité antérieure)',
      nombreEmployes: '700 collaborateurs',
      chiffreAffaires: '~40 M€ (budget annuel)',
      communesAssociees: '14 communes (Aiseau-Presles, Châtelet, Charleroi, Farciennes, Fleurus, Fontaine-l\'Évêque, Gerpinnes, Les Bons Villers, Montigny-le-Tilleul, Pont-à-Celles, Seneffe, Courcelles, Ham-sur-Heure-Nalinnes, Thuin)',
      populationDesservie: '~425 000 habitants',
      superficieDesservie: '535 km²',
      directeurGeneral: 'Philippe TELLER',
      presidentCA: 'Laurence DURIEUX',
      activites: [
        'Collecte des déchets ménagers et assimilés en porte-à-porte',
        'Gestion de 14 recyparcs',
        'Propreté publique — Charleroi et Aiseau-Presles (balayage, corbeilles, dépôts sauvages)',
        'Centre de tri VALTRIS',
        'Unité de valorisation énergétique',
        'Prévention et sensibilisation des citoyens',
        'Service d\'enlèvement gratuit des encombrants'
      ],
      siteWeb: 'https://www.tibi.be',
      telephone: '',
      email: ''
    },
    '8': {
      nom: 'BEP',
      statutJuridique: 'Bureau Économique de la Province de Namur',
      formeJuridique: 'Société coopérative à responsabilité limitée de droit public (SCRL DPU)',
      siegeSocial: 'Avenue Sergent Vrithoff 2, 5000 Namur, Belgique',
      dateCreation: '1963',
      nombreEmployes: '~147 ETP (structure faîtière)',
      chiffreAffaires: '~4,3 M€ (structure faîtière)',
      communesAssociees: '38 communes de la Province de Namur + Province de Namur',
      populationDesservie: '~500 000 habitants (Province de Namur)',
      superficieDesservie: 'Province de Namur',
      directeurGeneral: 'Renaud DEGUELDRE',
      presidentCA: '',
      activites: [
        'Développement économique (parcs d\'activités, incubateurs)',
        'Développement territorial (urbanisme, aménagement)',
        'Environnement (collecte et traitement des déchets via BEP Environnement)',
        'Gestion financière et participations énergétiques (via IDEFIN)',
        'Gestion de crématoriums (via BEP Crématorium)',
        'Gestion de Namur Expo',
        'Accompagnement des communes et des entreprises'
      ],
      sousStructures: [
        'BEP Environnement',
        'BEP Expansion Économique',
        'IDEFIN (financement énergétique)',
        'BEP Crématorium'
      ],
      siteWeb: 'https://www.bep.be',
      telephone: '+32 81 71 71 71',
      email: ''
    },
    '9': {
      nom: 'IGRETEC',
      statutJuridique: 'Intercommunale pour la Gestion et la Réalisation d\'Études Techniques et Économiques',
      formeJuridique: 'Société coopérative à responsabilité limitée (SCRL)',
      siegeSocial: 'Boulevard Mayence 1, 6000 Charleroi (SOLEO), Belgique',
      dateCreation: '1946 (fusion IEGSP + ADEC en 1985)',
      nombreEmployes: '~400 collaborateurs (380,3 ETP en 2024)',
      chiffreAffaires: '~71 M€ (2024)',
      communesAssociees: 'Plus de 70 communes wallonnes',
      populationDesservie: 'Wallonie et Bruxelles',
      superficieDesservie: 'Wallonie et Bruxelles',
      directeurGeneral: '',
      presidentCA: 'Steven ROYEZ (Les Engagés)',
      activites: [
        'Bureau d\'études pluridisciplinaire (bâtiments, infrastructures, urbanisme, environnement)',
        'Agence de développement économique, territorial et stratégique',
        'Assainissement et gestion des ouvrages d\'épuration et de démergement',
        'Activateur de projets énergétiques durables',
        'Gestionnaire d\'une intercommunale pure de financement',
        'Assistance à maîtrise d\'ouvrage'
      ],
      siteWeb: 'https://www.igretec.com',
      telephone: '',
      email: '',
      numeroBCE: 'BE 0201.741.786',
      beneficeNet: '~10 M€ (2024)',
      totalActif: '~667 M€ (2024)'
    }
  };
}

function getSampleInfos() {
  return {
    '2': {
      statutJuridique: 'Réforme des pensions — Belgique (gouvernement Arizona)',
      formeJuridique: 'Loi fédérale — Service fédéral des Pensions (SFPD)',
      siegeSocial: 'Bruxelles, Belgique',
      dateCreation: '31 janvier 2025 (accord de gvt) — 28 mai 2026 (vote Parlement)',
      nombreEmployes: '≈ 1,2 M de pensionnés (2026) | 5,2 M de travailleurs actifs concernés',
      budget: 'Économie budgétaire : -1,3 pt de PIB d\'ici 2070 (≈ -3,5 Mds €/an)',
      activites: [
        'Harmonisation des 3 statuts : salariés, indépendants, fonctionnaires',
        'Nouveau seuil : 156 jours/an pour valider une année de carrière (vs 104)',
        'Système bonus-malus avec % par année de naissance (2 % → 5 %)',
        'Retraite anticipée à 60 ans possible (42 ans carrière, 234 jours/an)',
        'Retraite anticipée à 63 ans (44 ans carrière, 156 jours/an)',
        'Âge légal : 66 ans (2025) → 67 ans (2030)',
        'Pension minimale : 1 845 €/mois (isolé), 2 305 €/mois (ménage) au 01/03/2026',
        'Plafond salarial calcul pension : 69 000 € brut/an (2026)',
        'Plafond Wijninckx (pension max) : gelé à 8 292 €/mois (non indexé jusqu\'à fin 2029)',
        'Indexation plafonnée : pensions > 2 000 €/mois indexées partiellement',
        'Allongement période référence fonctionnaires : 10 ans → jusqu\'à 45 ans en 2062',
        'Suppression des tantièmes préférentiels (passage à 1/60)',
        'Suppression pension pour incapacité médicale (01/04/2026)',
        '5 jours de réserve ("jours de malchance") pour éviter le malus',
        'Risque de pauvreté des retraités : +0,6 pt (de 5,5 % à 6,1 %) sous l\'effet de la réforme',
        'Inégalités (Gini) : +1,4 % chez les nouveaux retraités'
      ]
    },
    '3': {
      statutJuridique: 'Centre Régional d\'Aide aux Communes (CRAC)',
      formeJuridique: 'Organisme public wallon',
      siegeSocial: 'Rue du Hopital 25, 5000 Namur, Belgique',
      dateCreation: '',
      nombreEmployes: '',
      activites: [
        'Appui technique aux communes pour les travaux d\'intérêt général',
        'Financement de projets communaux (infrastructures, équipements)',
        'Accompagnement dans la gestion de projets',
        'Conseil technique aux bourgmestres et échevins',
        'Travaux de voirie et d\'assainissement',
        'Construction et rénovation d\'équipements communaux',
        'Aménagement du territoire',
        'Transition énergétique des bâtiments communaux'
      ]
    },
    '4': {
      statutJuridique: 'Plan Oxygène — Charleroi',
      formeJuridique: 'Plan de soutien économique régional (Wallonie)',
      siegeSocial: 'Charleroi, Belgique',
      dateCreation: '',
      nombreEmployes: '',
      activites: [
        'Report des charges sociales pour les entreprises en difficulté',
        'Prêts garantis par l\'État pour les PME',
        'Aides à la formation et reconversion professionnelle',
        'Soutien à l\'innovation et aux technologies de pointe',
        'Création de pôles d\'excellence (logistique, digital, industrie 4.0)'
      ]
    },
    '10': {
      statutJuridique: 'Plan de mobilité douce — Namur',
      formeJuridique: 'Plan communal / régional (Wallonie)',
      siegeSocial: 'Namur, Belgique',
      dateCreation: '',
      nombreEmployes: '',
      activites: [
        'Aménagement de pistes cyclables sécurisées',
        'Zones de rencontre et piétonnes',
        'Stationnements vélos sécurisés',
        'Intermodalité train-vélo',
        'Sensibilisation à la mobilité douce'
      ]
    }
  };
}

function getSampleFiches() {
  return [
    {
      id: '1',
      titre: 'Règlement Intérieur - Transport urbain',
      societe: 'RATP',
      type: 'reglement',
      couleur: '#0052A5',
      image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=400&fit=crop',
      contenu: '<h3>Dispositions générales</h3><ul><li>Port du badge obligatoire en permanence</li><li>Respect des horaires de service</li><li>Interdiction de téléphoner en conduite</li><li>Port de l\'uniforme réglementaire</li></ul><h3>Horaires de travail</h3><p>35 heures hebdomadaires. Rotations sur 7 jours. Majorations pour travail nocturne et dimanche.</p>',
      dateCreation: '2024-01-15',
      dateMiseAJour: '2024-06-01',
      villesConcernees: ['Paris', 'Lyon', 'Marseille'],
      resume: 'Règlement intérieur applicable aux agents de conduite et de contrôle'
    },
    {
      id: '2',
      titre: 'Réforme des pensions Belgique 2025-2029',
      societe: 'Gouvernement fédéral belge – Arizona',
      type: 'reforme',
      couleur: '#D97706',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop',
      contenu: '<h3>Contexte</h3><p>La coalition Arizona (De Wever) a conclu un accord de gouvernement le 31 janvier 2025 pour la législature 2025-2029. La réforme des pensions a été votée au Parlement le 28 mai 2026 et publiée au Moniteur belge le 1er juin 2026. Entrée en vigueur au 1er janvier 2027.</p><h3>Calendrier clé</h3><ul><li><strong>31 janvier 2025</strong> — Accord de gouvernement Arizona</li><li><strong>11 avril 2025</strong> — Suppression du bonus pension 2025 (bonus Lalieux)</li><li><strong>21 juillet 2025</strong> — Accord d\'été Arizona, premier accord sur la réforme</li><li><strong>12 décembre 2025</strong> — Accord en 2e lecture au Conseil des ministres</li><li><strong>6 mars 2026</strong> — Accord final (3e lecture) sur les derniers détails</li><li><strong>28 mai 2026</strong> — Vote au Parlement fédéral (majorité contre opposition)</li><li><strong>1er juin 2026</strong> — Publication au Moniteur belge</li><li><strong>8 juin 2026</strong> — Suspension des estimations sur mypension.be</li><li><strong>Automne 2026</strong> — Date de pension + proche disponible (nouvelle législation)</li><li><strong>Fin 2026</strong> — Date de pension sans malus disponible</li><li><strong>1er janvier 2027</strong> — Entrée en vigueur des nouvelles règles</li><li><strong>2e semestre 2027</strong> — Montants de pension disponibles (nouvelle législation)</li><li><strong>Fin 2027</strong> — Simulations mypension.be à nouveau disponibles</li><li><strong>1er janvier 2030</strong> — Âge légal passe à 67 ans</li><li><strong>2031</strong> — Coefficient revalorisation fonctionnaires réduit à 1,02</li><li><strong>2040</strong> — Malus à 5 % (phase terminale)</li><li><strong>2062</strong> — Période de référence des fonctionnaires atteint 45 ans</li><li><strong>2070</strong> — Plein effet budgétaire de la réforme</li></ul><h3>Âge légal de la pension</h3><table><tr><th>Période</th><th>Âge légal</th></tr><tr><td>Jusqu\'à 2024</td><td>65 ans</td></tr><tr><td>2025 – 2029</td><td>66 ans</td></tr><tr><td>À partir de 2030</td><td>67 ans</td></tr></table><h3>Conditions de retraite anticipée (dès 2027)</h3><table><tr><th>Âge mini.</th><th>Années carrière</th><th>Jours/an requis</th></tr><tr><td>60 ans</td><td>42 ans</td><td>234 jours effectifs</td></tr><tr><td>61 ans</td><td>43 ans</td><td>234 jours effectifs</td></tr><tr><td>63 ans</td><td>44 ans</td><td>156 jours</td></tr><tr><td>À partir de 66-67 ans</td><td>Variable</td><td>156 jours (pas de condition d\'âge)</td></tr></table><p><em>Règle générale pour valider une année de carrière : 156 jours (vs 104 avant réforme). Exception : 104 jours conservés pour la 1ʳᵉ année de carrière.</em></p><h3>Système Bonus / Malus</h3><p><strong>Conditions d\'évitement du malus (et d\'accès au bonus) :</strong></p><ul><li>35 années de carrière avec ≥ 156 jours effectifs chacune</li><li>ET ≥ 7 020 jours de travail effectif sur l\'ensemble de la carrière</li></ul><p><strong>Malus (réduction de la pension) :</strong> si vous prenez une retraite anticipée sans remplir les conditions ci-dessus, le montant brut de votre pension est réduit d\'un pourcentage par année d\'anticipation.</p><table><tr><th>Année de naissance</th><th>% de malus par année d\'anticipation</th></tr><tr><td>≤ 1960</td><td>0 %</td></tr><tr><td>1961 – 1965</td><td>2 %</td></tr><tr><td>1966 – 1974</td><td>4 %</td></tr><tr><td>≥ 1975</td><td>5 %</td></tr></table><p><em>Exemple concret : départ à 63 ans (âge légal 67, soit 4 ans d\'anticipation) + année de naissance ≥ 1975 → 4 × 5 % = 20 % de réduction. Une pension brute de 2 000 €/mois passerait à 1 600 €/mois à vie.</em></p><p><strong>Bonus (majoration de la pension) :</strong> si vous retardez votre départ après l\'âge légal ET remplissez les conditions de carrière, vous constituez un bonus dès le 1er janvier 2026.</p><table><tr><th>Année de naissance</th><th>% de bonus par année reportée</th></tr><tr><td>≤ 1962</td><td>2 %</td></tr><tr><td>1963 – 1972</td><td>4 %</td></tr><tr><td>≥ 1973</td><td>5 %</td></tr></table><p><em>Le bonus est proratisé pour les reportés de moins d\'un an complet. Les périodes de maladie et chômage ne sont PAS comptées pour le bonus.</em></p><h3>Pensions minimales — Montants au 01/03/2026</h3><table><tr><th>Type</th><th>Montant brut/mois</th></tr><tr><td>Pension minimum — isolé (carrière complète 45 ans)</td><td>1 844,93 €</td></tr><tr><td>Pension minimum — ménage (carrière complète 45 ans)</td><td>2 305,44 €</td></tr><tr><td>Pension de survie</td><td>1 820,27 €</td></tr><tr><td>GRAPA — isolé</td><td>≈ 1 350 €</td></tr><tr><td>GRAPA — cohabitant</td><td>≈ 900 €</td></tr></table><h3>Plafonds et calcul de la pension</h3><table><tr><th>Indicateur</th><th>Montant 2026</th></tr><tr><td>Plafond salarial pris en compte</td><td>≈ 69 000 € brut/an (5 750 €/mois)</td></tr><tr><td>Plafond indépendant — revenu minimum</td><td>17 374 €/an</td></tr><tr><td>Plafond indépendant — revenu maximum</td><td>80 627 €/an</td></tr><tr><td>Plafond Wijninckx (pension brute max)</td><td>8 292 €/mois (gelé jusqu\'à fin 2029)</td></tr></table><p><strong>Rappel formule :</strong> Pension annuelle = Somme (salaire plafonné × taux) / 45 pour chaque année de carrière. Taux isolé : 60 % du salaire plafonné. Taux ménage : 75 % si le conjoint n\'a pas de pension propre.</p><h3>Indexation</h3><ul><li><strong>Indexation plafonnée des pensions</strong> (dès le 1er juillet 2025) : seules les pensions ≤ 2 000 €/mois sont pleinement indexées. Au-delà, l\'augmentation est limitée à 34,55 € brut/mois (jusqu\'à fin 2029 ou après la 5e indexation).</li><li><strong>Indexation plafonnée des salaires</strong> (mesure budgétaire) : index en centimes au-delà de 4 000 € brut.</li><li><strong>Suspension de l\'enveloppe bien-être</strong> : pas de revalorisation des plus petites pensions pendant la législature.</li></ul><h3>Périodes assimilées</h3><p>Pour le calcul des 156 jours/an et du bonus/malus, les périodes suivantes sont <strong>comptées</strong> : congés de maternité/paternité, congés pour aidants proches, arrêts maladie (<em>limités à 30 jours/an pour le malus — avec correction maladie au-delà</em>), chômage temporaire. Les périodes suivantes <strong>ne sont pas comptées</strong> : chômage complet (salaire fictif limité au plafond minimum dès le 01/02/2025), maladie au-delà de 30 jours/an (sauf AT/MP).</p><p><strong>Limitation des jours assimilés</strong> (pas encore votée, à partir de juillet 2027) : seuls 20 % de la carrière pourront être constitués de périodes assimilées de chômage et de fin de carrière. Mesure dépendante de l\'année de naissance.</p><h3>Impact fonctionnaires</h3><p>Les fonctionnaires statutaires sont les plus touchés par la réforme, avec une baisse du <em>taux de remplacement</em> estimée à -15 % d\'ici 2070 (vs -7 % salariés, -3 % indépendants). Principales mesures :</p><ul><li><strong>Disparition des tantièmes préférentiels</strong> (1/50, 1/55) → passage général au 1/60 dès 2027. Les années antérieures restent acquises.</li><li><strong>Allongement de la période de référence</strong> : calcul sur les 10 dernières années → progressivement sur l\'ensemble de la carrière (45 ans en 2062). Nés en 1963 : 11 ans, 1964 : 12 ans, etc. Nés à partir de 1997 : 45 ans.</li><li><strong>Coefficient d\'augmentation</strong> (1,05 pour certains) : progressivement réduit à 1,025 en 2032.</li><li><strong>Péréquation supprimée</strong> à partir de 2026, intégrée à l\'enveloppe bien-être.</li><li><strong>Plafond Wijninckx</strong> gelé (non indexé) jusqu\'à fin 2029.</li></ul><p><em>Conséquence concrète : un fonctionnaire né en 1997+ aura sa pension calculée sur 45 ans de salaire au lieu des 10 meilleures années, ce qui réduira significativement son taux de remplacement.</em></p><h3>Mesures spécifiques</h3><ul><li><strong>Militaires</strong> : âge de départ progressivement relevé de 56 à 67 ans (à partir de 2027, +1 an/an)</li><li><strong>Conducteurs de train</strong> : âge de départ relevé de 55 à 67 ans (même calendrier)</li><li><strong>Enseignement maternel/primaire/secondaire</strong> : maintien partiel du coefficient 1,05 réduit progressivement</li><li><strong>Pompiers, police, contrôleurs aériens, pilotes maritimes</strong> : maintien d\'un coefficient distinct</li><li><strong>Indépendants</strong> : seuil de 156 jours = 2 trimestres. Revenu minimum calcul pension : 17 374 €/an (2026). Mécanisme identique bonus-malus.</li></ul><h3>Mesures transitoires</h3><ul><li><strong>Clause de sécurité</strong> : ceux qui peuvent prendre une pension anticipée en 2025 ou 2026 aux conditions actuelles conservent leurs conditions (même s\'ils partent après 2027)</li><li><strong>Nés avant 1966</strong> : report de la date de pension d\'1 an max par rapport aux règles actuelles</li><li><strong>Nés en 1966</strong> : report de 2 ans max</li><li><strong>5 jours de réserve</strong> ("jours de malchance") sur l\'ensemble de la carrière pour combler les années où les 156 jours ne sont pas atteints (ex. : ajouter 1 jour/an pendant 5 ans, ou 5 jours sur une seule année)</li><li><strong>Mi-temps et horaires variables</strong> : des mesures d\'atténuation permettent de compléter les années déficitaires avec des jours excédentaires d\'autres années</li></ul><h3>Impact budgétaire et social (Bureau fédéral du Plan)</h3><ul><li><strong>Économie budgétaire</strong> : -1,3 pt de PIB d\'ici 2070 (≈ -3,5 Mds €/an) — dont -0,7 pt via les fonctionnaires, -0,6 pt via les salariés</li><li><strong>Baisse du montant brut moyen de la pension des nouveaux retraités</strong> : -2,4 % d\'ici 2029</li><li><strong>Taux de remplacement (pension/dernier salaire)</strong> en 2070 : -15 % fonctionnaires, -7 % salariés, -3 % indépendants</li><li><strong>Écart femmes-hommes</strong> : le benefit ratio diminue plus chez les femmes (-6,6 %) que chez les hommes (-5,8 %) dans le régime salariés. Effet inverse chez les fonctionnaires (-13,8 % hommes vs -12,8 % femmes)</li><li><strong>Risque de pauvreté</strong> des retraités : +0,6 pt (de 5,5 % à 6,1 %). Chez les isolés : +0,7 pt hommes, +0,6 pt femmes</li><li><strong>Inégalités</strong> (coefficient de Gini) : +1,4 % chez les nouveaux retraités</li></ul><h3>Calendrier mypension.be</h3><ul><li><strong>8 juin 2026</strong> : suspension des estimations de date et montant de la pension (mise à jour des algorithmes)</li><li><strong>Automne 2026</strong> : date de pension la plus proche disponible</li><li><strong>Fin 2026</strong> : date sans malus disponible</li><li><strong>2e semestre 2027</strong> : montants estimés disponibles</li><li><strong>Fin 2027</strong> : simulations complètes à nouveau disponibles</li></ul><h3>Liens utiles</h3><p>Voir la section « 🔗 Liens utiles » ci-dessous pour tous les liens officiels.</p>',
      dateCreation: '2024-03-20',
      dateMiseAJour: '2026-06-01',
      villesConcernees: ['Bruxelles', 'Wallonie', 'Flandre'],
      resume: 'Réforme des pensions belge (Arizona) – harmonisation statuts, bonus-malus, seuil 156 jours, âge 66→67 ans',
      liens: [
        { nom: 'SFPD — Page officielle de la réforme des pensions', url: 'https://www.sfpd.fgov.be/fr/changements/reforme-des-pensions/' },
        { nom: 'Communiqué de presse SFPD — 29 mai 2026 (PDF, 22 p.)', url: 'https://www.sfpd.fgov.be/files/3556/20260529_r%C3%A9formepensionsapprobation_cequecasignifiepourvouscitoyens.pdf' },
        { nom: 'reformedespensions.be — Portail citoyen', url: 'https://www.reformedespensions.be' },
        { nom: 'MyPension.be — Estimation personnalisée', url: 'https://www.mypension.be' },
        { nom: 'FAQ INASTI — Réformes pensions (indépendants)', url: 'https://www.inasti.be/fr/faq/reformes-des-pensions-2025-2029' },
        { nom: 'Bureau fédéral du Plan — Évaluation budgétaire', url: 'https://www.plan.be/fr/publications/evaluation-budgetaire-et-sociale-de-la-reforme-des' },
        { nom: 'Bureau fédéral du Plan — Effets distributifs', url: 'https://www.plan.be/fr/publications/effets-distributifs-de-la-reforme-des-pensions-du' },
        { nom: 'Article RTBF — Vote de la loi-programme (29 mai 2026)', url: 'https://www.rtbf.be/article/la-loi-programme-de-l-arizona-adoptee-a-la-chambre-lors-d-un-vote-nocturne-11731612' }
      ]
    },
    {
      id: '3',
      titre: 'Plan CRAC - Centre Régional d\'Aide aux Communes',
      societe: 'Région Wallonne',
      type: 'plan-crac',
      couleur: '#059669',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop',
      contenu: '<h3>Le CRAC - Centre Régional d\'Aide aux Communes</h3><p>Le CRAC est un organisme public wallon qui apporte son appui technique et financier aux communes pour la réalisation de projets d\'intérêt communal.</p><h3>Missions principales</h3><ul><li>Appui technique aux communes pour les travaux d\'intérêt général</li><li>Financement de projets communaux (infrastructures, équipements)</li><li>Accompagnement dans la gestion de projets</li><li>Conseil technique aux bourgmestres et échevins</li></ul><h3>Domaines d\'intervention</h3><ul><li>Travaux de voirie et d\'assainissement</li><li>Construction et rénovation d\'équipements communaux</li><li>Aménagement du territoire</li><li>Transition énergétique des bâtiments communaux</li></ul><h3>Provinces couvertes</h3><p>Le CRAC intervient dans les 5 provinces wallonnés :</p><ul><li>Province de Liège</li><li>Province de Namur</li><li>Province du Hainaut</li><li>Province du Luxembourg</li><li>Province de Brabant wallon</li></ul><h3>Contact</h3><p>SPW Logement, Infrastructure et Énergie<br>Rue du Hopital 25<br>5000 Namur</p>',
      dateCreation: '2024-02-10',
      dateMiseAJour: '2024-06-15',
      villesConcernees: ['Liège', 'Namur', 'Charleroi', 'Mons', 'Tournai', 'Arlon', 'Wavre', 'Nivelles', 'Huy', 'Verviers'],
      resume: 'Centre Régional d\'Aide aux Communes - Appui technique et financier aux communes wallonnes pour les projets d\'intérêt communal'
    },
    {
      id: '4',
      titre: 'Plan Oxygène - Charleroi',
      societe: 'SPF Economie / Région Wallonne',
      type: 'plan-oxygene',
      couleur: '#7C3AED',
      image: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=400&fit=crop',
      contenu: '<h3>Contexte</h3><p>Charleroi, ancien bassin industriel, fait face à un taux de chômage élevé (23,6% en 2022). Le Plan Oxygène vise à soutenir la restructuration économique de la région carolorégienne.</p><h3>Mesures principales</h3><ul><li>Report des charges sociales pour les entreprises en difficulté</li><li>Prêts garantis par l\'État pour les PME</li><li>Aides à la formation et reconversion professionnelle</li><li>Soutien à l\'innovation et aux technologies de pointe</li><li>Création de pôles d\'excellence (logistique, digital, industrie 4.0)</li></ul><h3>Bénéficiaires</h3><p>PME et ETI de moins de 5000 salariés dans les secteurs impactés par la transition industrielle. Priorité aux entreprises implantées dans l\'arrondissement administratif de Charleroi.</p><h3>Contact</h3><p>FOREM Hainaut - Place Albert 1er, 30 - 6000 Charleroi</p>',
      dateCreation: '2024-01-05',
      dateMiseAJour: '2024-06-10',
      villesConcernees: ['Charleroi', 'Marcinelle', 'Gilly', 'Jumet', 'Gosselies', 'Marchienne-au-Pont', 'Montignies-sur-Sambre', 'Couillet', 'Dampremy', 'Lodelinsart'],
      resume: 'Plan de soutien économique aux entreprises de Charleroi et de l\'arrondissement - Aides à la reconversion industrielle et au développement économique local'
    },
    {
      id: '5',
      titre: 'Loi travail - Droit de retrait',
      societe: 'Gouvernement',
      type: 'loi',
      couleur: '#DC2626',
      image: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=800&h=400&fit=crop',
      contenu: '<h3>Conditions de retrait</h3><ul><li>Vie ou santé en danger immédiat</li><li>Situation de danger grave et imminent</li><li>Information de l\'employeur dans les meilleurs délais</li><li>Pas de retrait abusif sous peine de sanctions</li></ul><h3>Procédure</h3><p>Déclaration écrite dans les 24h. Consultation du CSE obligatoire.</p>',
      dateCreation: '2024-04-01',
      dateMiseAJour: '2024-06-10',
      villesConcernees: ['Toutes les villes'],
      resume: 'Encadrement du droit de retrait des salariés'
    },
    {
      id: '7',
      titre: 'Procédures TIBI',
      societe: 'TIBI',
      type: 'suivi',
      couleur: '#0891B2',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=400&fit=crop',
      logo: 'tibi.png',
      contenu: '<h3>TIBI — Gestion intégrée des déchets</h3><p>TIBI est l\'intercommunale de gestion des déchets de la région de Charleroi, active dans la collecte, le tri, le recyclage et la valorisation des déchets ménagers.</p>',
      dateCreation: '2025-01-01',
      dateMiseAJour: '2025-01-01',
      villesConcernees: ['Charleroi', 'Couillet', 'Gosselies', 'Jumet', 'Montignies-sur-Sambre', 'Châtelet', 'Farciennes', 'Fleurus', 'Fontaine-l\'Évêque', 'Gerpinnes', 'Les Bons Villers', 'Pont-à-Celles', 'Courcelles', 'Ham-sur-Heure-Nalinnes'],
      resume: 'TIBI — Intercommunale de gestion intégrée des déchets ménagers — Région de Charleroi'
    },
    {
      id: '8',
      titre: 'Procédures BEP',
      societe: 'BEP',
      type: 'suivi',
      couleur: '#0891B2',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop',
      logo: 'bep.png',
      contenu: '<h3>BEP — Bureau Économique de la Province de Namur</h3><p>Le BEP est chargé du développement économique, social et environnemental de la Province de Namur. Créé en 1963, il regroupe 4 intercommunales thématiques.</p>',
      dateCreation: '2025-01-01',
      dateMiseAJour: '2025-01-01',
      villesConcernees: ['Namur', 'Andenne', 'Dinant', 'Philippeville', 'Ciney', 'Rochefort', 'Florennes', 'Yvoir', 'Sambreville', 'Fosses-la-Ville'],
      resume: 'BEP — Bureau Économique de la Province de Namur — Développement économique, environnement et territoire'
    },
    {
      id: '9',
      titre: 'Procédures IGRETEC',
      societe: 'IGRETEC',
      type: 'suivi',
      couleur: '#0891B2',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop',
      logo: 'IGRETEC.png',
      contenu: '<h3>IGRETEC — Intercommunale pour la Gestion et la Réalisation d\'Études Techniques et Économiques</h3><p>IGRETEC est un bureau d\'études pluridisciplinaire et une agence de développement économique active en Wallonie et à Bruxelles. Plus de 1 200 projets menés à bien.</p>',
      dateCreation: '2025-01-01',
      dateMiseAJour: '2025-01-01',
      villesConcernees: ['Charleroi', 'Mons', 'La Louvière', 'Tournai', 'Binche', 'Thuin', 'Chimay', 'Beaumont', 'Estinnes', 'Lobbes'],
      resume: 'IGRETEC — Intercommunale pour la Gestion et la Réalisation d\'Études Techniques et Économiques — Wallonie & Bruxelles'
    },
    {
      id: '10',
      titre: 'Plan de mobilité douce - Namur',
      societe: 'Région Wallonne',
      type: 'plans-divers',
      couleur: '#EA580C',
      image: 'https://images.unsplash.com/photo-1573495612937-f0135b4f7c5e?w=800&h=400&fit=crop',
      contenu: '<h3>Plan de mobilité douce</h3><ul><li>Aménagement de pistes cyclables sécurisées</li><li>Zones de rencontre et piétonnes</li><li>Stationnements vélos sécurisés</li><li>Intermodalité train-vélo</li></ul><h3>Calendrier</h3><p>Phase 1 : 2025-2026. Phase 2 : 2027-2028.</p>',
      dateCreation: '2025-03-15',
      dateMiseAJour: '2025-06-01',
      villesConcernees: ['Namur', 'Jambes', 'Saint-Servais', 'Beez'],
      resume: 'Plan de développement des mobilités douces dans l\'arrondissement de Namur',
      infos: {
        statutJuridique: 'Plan de mobilité douce — Namur',
        formeJuridique: 'Plan communal / régional (Wallonie)',
        siegeSocial: 'Namur, Belgique',
        activites: ['Aménagement de pistes cyclables sécurisées', 'Zones de rencontre et piétonnes', 'Stationnements vélos sécurisés', 'Intermodalité train-vélo', 'Sensibilisation à la mobilité douce']
      }
    }
  ];
}

function saveFiches() {
  try {
    localStorage.setItem('slfp_fiches', JSON.stringify(fiches));
    console.log('saveFiches OK, saved', fiches.length, 'fiches to localStorage');
    return true;
  } catch (e) {
    console.error('saveFiches FAILED (quota), stripping PDF data:', e);
    try {
      var stripped = JSON.parse(JSON.stringify(fiches));
      var pdfCount = 0;
      function stripPdfs(obj) {
        if (!obj || typeof obj !== 'object') return;
        Object.keys(obj).forEach(function(k) {
          if (k === 'pdfs' && Array.isArray(obj[k])) {
            pdfCount += obj[k].length;
            obj[k] = obj[k].map(function(p) { return { name: p.name, company: p.company || '' }; });
          } else if (Array.isArray(obj[k])) {
            obj[k].forEach(stripPdfs);
          } else if (obj[k] && typeof obj[k] === 'object') {
            stripPdfs(obj[k]);
          }
        });
      }
      stripped.forEach(stripPdfs);
      localStorage.setItem('slfp_fiches', JSON.stringify(stripped));
      console.log('saveFiches OK (stripped), removed', pdfCount, 'PDF data URLs');
      showNotification('Sauvegardé sans les PDF (place insuffisante). Ré-importez les PDF via Firebase.');
      return true;
    } catch (e2) {
      console.error('saveFiches FAILED even stripped:', e2);
      showNotification('Erreur de sauvegarde : espace localStorage saturé');
      return false;
    }
  }
}

function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', handleSearch);

  document.getElementById('filterSelect').addEventListener('change', handleFilter);

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('adminBtn').addEventListener('click', openAdmin);
  document.getElementById('closeAdmin').addEventListener('click', closeAdmin);
  document.getElementById('homeBtn').addEventListener('click', goHome);
  document.getElementById('homeMainBtn').addEventListener('click', goHome);
  document.getElementById('addFicheBtn').addEventListener('click', openAddModal);
  document.getElementById('adminModalClose').addEventListener('click', closeAdminModal);
  document.getElementById('adminModalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAdminModal();
  });
  document.getElementById('cancelForm').addEventListener('click', closeAdminModal);

  // Cloud sync buttons
  document.getElementById('cloudSaveBtn').addEventListener('click', saveToCloud);
  document.getElementById('backupBtn').addEventListener('click', backupData);
  document.getElementById('restoreBtn').addEventListener('click', restoreData);

  setupPagination();
  setupUpdateCloud();
  setupImagePreview();
  setupLogoPreview();
  setupEditor();
  setupPdfAdd();
  setupLiensAdd();
  setupExternalDocsAdd();
}

// ========== PDF LIST MANAGEMENT ==========

let pdfEntries = [];

function renderPdfList() {
  const list = document.getElementById('pdfList');
  list.innerHTML = pdfEntries.map((entry, i) => {
    var isFirebaseUrl = entry.data && entry.data.startsWith('http');
    var sizeLabel = isFirebaseUrl ? 'Cloud' : (entry.data ? (entry.data.length > 50000 ? '>50 Ko' : '<50 Ko') : '');
    return `
    <div class="pdf-item">
      <div style="flex:1;min-width:0;">
        <div class="pdf-item-name">${escHtml(entry.name)}</div>
        ${entry.company ? `<div class="pdf-item-company">${escHtml(entry.company)}</div>` : ''}
        <div style="font-size:0.65rem;color:#9CA3AF;">${sizeLabel}</div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;">
        ${entry.data ? `<button type="button" class="pdf-item-preview" onclick="previewPdfEntry(${i})" title="Aperçu" style="background:none;border:1px solid #D1D5DB;border-radius:4px;cursor:pointer;padding:2px 6px;font-size:0.7rem;">👁</button>` : ''}
        <button type="button" class="pdf-item-remove" onclick="removePdfEntry(${i})">×</button>
      </div>
    </div>`;
  }).join('');
}

function removePdfEntry(index) {
  pdfEntries.splice(index, 1);
  renderPdfList();
}

function previewPdfEntry(index) {
  var entry = pdfEntries[index];
  if (!entry || !entry.data) return;
  var src = entry.data.startsWith('http') ? entry.data : dataUrlToBlobUrl(entry.data);
  var w = window.open('', '_blank');
  if (!w) { showNotification('Autorisez les popups'); return; }
  w.document.write('<!DOCTYPE html><html><head><title>' + escHtml(entry.name) + '</title><style>body{margin:0;padding:0;}embed{width:100%;height:100vh;}</style></head><body><embed src="' + src + '" type="application/pdf"></body></html>');
}

function setupPdfAdd() {
  const addBtn = document.getElementById('addPdfBtn');
  const list = document.getElementById('pdfList');

  addBtn.addEventListener('click', () => {
    if (document.getElementById('pdfAddForm')) return;

    const form = document.createElement('div');
    form.id = 'pdfAddForm';
    form.className = 'pdf-add-form';
    form.innerHTML = `
      <input type="text" id="pdfCompanyName" placeholder="Nom (ex: Rapport 2025)">
      <input type="file" id="pdfFileInput" accept=".pdf" multiple style="font-size:14px;">
      <div style="font-size:0.75rem;color:#6B7280;margin:2px 0;">${useFirebase ? 'Upload vers Firebase (cloud) ✓' : 'Stockage local — fichiers < 800 Ko'}</div>
      <div class="pdf-add-actions">
        <button type="button" class="pdf-add-confirm" id="pdfAddConfirm">Ajouter</button>
        <button type="button" class="pdf-add-cancel" id="pdfAddCancel">Annuler</button>
      </div>
    `;
    list.after(form);

    document.getElementById('pdfAddConfirm').addEventListener('click', async () => {
      const company = document.getElementById('pdfCompanyName').value.trim();
      const files = document.getElementById('pdfFileInput').files;
      if (!files || files.length === 0) { showNotification('Sélectionnez un ou plusieurs PDF'); return; }

      var added = 0;
      for (var fi = 0; fi < files.length; fi++) {
        var file = files[fi];
        if (!useFirebase && file.size > 0.8 * 1024 * 1024) {
          showNotification('Fichier > 800 Ko sans Firebase : ignoré (' + file.name + ')');
          continue;
        }
        var pdfEntry;
        if (useFirebase) {
          try {
            var result = await uploadPDFToFirebase(file, 'admin_' + Date.now());
            if (result) {
              pdfEntry = { name: result.name, company: company || '', data: result.url };
            }
          } catch(e) {
            console.error('Firebase upload failed for', file.name, e);
          }
        }
        if (!pdfEntry) {
          var dataUrl = await new Promise(function(resolve) {
            var r = new FileReader();
            r.onload = function(ev) { resolve(ev.target.result); };
            r.readAsDataURL(file);
          });
          pdfEntry = { name: file.name, company: company || '', data: dataUrl };
        }
        pdfEntries.push(pdfEntry);
        added++;
      }
      renderPdfList();
      form.remove();
      if (added > 0) showNotification(added + ' PDF ajouté(s)');
    });

    document.getElementById('pdfAddCancel').addEventListener('click', () => form.remove());
  });
}

function getPdfEntries() {
  return pdfEntries;
}

function setPdfEntries(entries) {
  pdfEntries = entries || [];
  renderPdfList();
}

// ========== LIENS UTILES MANAGEMENT ==========

let liensEntries = [];

function renderLiensList() {
  const list = document.getElementById('liensList');
  if (!list) return;
  list.innerHTML = liensEntries.map((entry, i) => `
    <div class="pdf-item">
      <div style="flex:1">
        <input type="text" class="lien-nom-input" data-index="${i}" value="${escHtml(entry.nom || '')}" placeholder="Nom du lien (ex: Site officiel)" style="width:100%;margin-bottom:4px;">
        <input type="url" class="lien-url-input" data-index="${i}" value="${escHtml(entry.url || '')}" placeholder="https://..." style="width:100%;">
      </div>
      <button type="button" class="pdf-item-remove" onclick="removeLienEntry(${i})">×</button>
    </div>
  `).join('');
  // Sync input changes to array
  list.querySelectorAll('.lien-nom-input').forEach(function(input) {
    input.addEventListener('input', function() { liensEntries[parseInt(this.dataset.index)].nom = this.value; });
  });
  list.querySelectorAll('.lien-url-input').forEach(function(input) {
    input.addEventListener('input', function() { liensEntries[parseInt(this.dataset.index)].url = this.value; });
  });
}

function removeLienEntry(index) {
  liensEntries.splice(index, 1);
  renderLiensList();
}

function addLienEntry(nom, url) {
  liensEntries.push({ nom: nom || '', url: url || '' });
  renderLiensList();
}

function setLiensEntries(entries) {
  liensEntries = entries && entries.length > 0 ? entries.map(function(e) { return { nom: e.nom || '', url: e.url || '' }; }) : [];
  renderLiensList();
}

function setupLiensAdd() {
  var addBtn = document.getElementById('addLienBtn');
  if (!addBtn) return;
  addBtn.addEventListener('click', function() { addLienEntry('', ''); });
}

// ========== EXTERNAL DOCS (Google Drive, Dropbox, etc.) ==========

let externalDocsEntries = [];

function renderExternalDocsList() {
  const list = document.getElementById('externalDocsList');
  if (!list) return;
  list.innerHTML = externalDocsEntries.map((entry, i) => `
    <div class="pdf-item">
      <div style="flex:1">
        <input type="text" class="extdoc-nom-input" data-index="${i}" value="${escHtml(entry.nom || '')}" placeholder="Nom du document (ex: Rapport 2025)" style="width:100%;margin-bottom:4px;">
        <input type="url" class="extdoc-url-input" data-index="${i}" value="${escHtml(entry.url || '')}" placeholder="https://drive.google.com/..." style="width:100%;">
      </div>
      <button type="button" class="pdf-item-remove" onclick="removeExternalDocEntry(${i})">×</button>
    </div>
  `).join('');
  list.querySelectorAll('.extdoc-nom-input').forEach(function(input) {
    input.addEventListener('input', function() { externalDocsEntries[parseInt(this.dataset.index)].nom = this.value; });
  });
  list.querySelectorAll('.extdoc-url-input').forEach(function(input) {
    input.addEventListener('input', function() { externalDocsEntries[parseInt(this.dataset.index)].url = this.value; });
  });
}

function removeExternalDocEntry(index) {
  externalDocsEntries.splice(index, 1);
  renderExternalDocsList();
}

function addExternalDocEntry(nom, url) {
  externalDocsEntries.push({ nom: nom || '', url: url || '' });
  renderExternalDocsList();
}

function setExternalDocsEntries(entries) {
  externalDocsEntries = entries && entries.length > 0 ? entries.map(function(e) { return { nom: e.nom || '', url: e.url || '' }; }) : [];
  renderExternalDocsList();
}

function setupExternalDocsAdd() {
  var addBtn = document.getElementById('addExternalDocBtn');
  if (!addBtn) return;
  addBtn.addEventListener('click', function() { addExternalDocEntry('', ''); });
}

// ========== WYSIWYG EDITOR ==========

function setupEditor() {
  document.querySelectorAll('.editor-toolbar').forEach(toolbar => {
    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.editor-btn');
      if (!btn) return;

      const cmd = btn.dataset.cmd;
      const val = btn.dataset.val || null;
      const container = toolbar.closest('.editor-container');
      const editor = container.querySelector('.editor-content');

      editor.focus();

      if (cmd === 'createLink') {
        const url = prompt('URL du lien :', 'https://');
        if (url) document.execCommand(cmd, false, url);
      } else if (cmd === 'formatBlock') {
        document.execCommand(cmd, false, '<' + val + '>');
      } else if (cmd === 'insertCustomList') {
        const bulletMap = { square: '▪', dash: '–', arrow: '➢' };
        const bullet = bulletMap[val] || '•';
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const li = document.createElement('li');
        li.style.listStyle = 'none';
        li.innerHTML = bullet + ' ';
        if (range.collapsed) {
          range.insertNode(li);
        } else {
          const frag = range.extractContents();
          li.appendChild(frag);
          range.insertNode(li);
        }
        range.setStartAfter(li);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        editor.focus();
      } else {
        document.execCommand(cmd, false, val);
      }
    });
  });
}

function getEditorContent() {
  return document.getElementById('ficheContenu').innerHTML;
}

function setEditorContent(html) {
  document.getElementById('ficheContenu').innerHTML = html || '';
}

function getResumeContent() {
  return document.getElementById('ficheResume').innerHTML;
}

function setResumeContent(html) {
  document.getElementById('ficheResume').innerHTML = html || '';
}

// ========== RESET DATA ==========

async function resetData() {
  if (!confirm('Réinitialiser toutes les données ?\n\nLes anciennes fiches seront supprimées et remplacées par les fiches d\'exemple.')) {
    return;
  }
  
  try {
    // Delete all existing fiches from Firebase
    const snapshot = await fichesRef.get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    // Add sample fiches
    const sampleFiches = getSampleFiches();
    for (const fiche of sampleFiches) {
      await fichesRef.doc(fiche.id).set(fiche);
    }
    
    fiches = sampleFiches;
    saveFiches();
    filteredFiches = getHomeFiches();
    renderCards();
    renderAdminList();
    updatePagination();
    
    showNotification('Données réinitialisées !');
  } catch (error) {
    console.error('Erreur reset:', error);
    showNotification('Erreur lors de la réinitialisation');
  }
}

// ========== BACKUP/RESTORE FUNCTIONS ==========

function backupData() {
  const data = {
    version: '1.0',
    date: new Date().toISOString(),
    fiches: fiches
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `slfp-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  showNotification('Sauvegarde téléchargée !');
}

function restoreData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (data.fiches && Array.isArray(data.fiches)) {
          if (confirm(`Restaurer ${data.fiches.length} fiches ?\n\nDate de la sauvegarde : ${new Date(data.date).toLocaleString('fr-FR')}`)) {
            fiches = data.fiches;
            saveFiches();
    filteredFiches = getHomeFiches();
    updateRoiLogos();
    renderCards();
    renderAdminList();
    updatePagination();
            showNotification(`${fiches.length} fiches restaurées !`);
          }
        } else {
          showNotification('Fichier de sauvegarde invalide');
        }
      } catch (error) {
        console.error('Erreur restauration:', error);
        showNotification('Erreur : fichier invalide');
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
}

// ========== CLOUD SYNC FUNCTIONS ==========

async function saveToCloud() {
  const btn = document.getElementById('cloudSaveBtn');
  
  // Check if Firebase is initialized
  if (!useFirebase) {
    showNotification('Firebase non connecté. Vérifiez la configuration.');
    return;
  }
  
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
    ...
  `;
  btn.disabled = true;
  
  try {
    // Save all fiches to Firestore
    const batch = db.batch();
    
    for (const fiche of fiches) {
      const ref = fichesRef.doc(fiche.id);
      batch.set(ref, fiche);
    }
    
    await batch.commit();
    
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      OK !
    `;
    
    showNotification(`${fiches.length} fiches sauvegardées`);
    
    setTimeout(() => {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Sauver
      `;
      btn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    showNotification('Erreur: ' + error.message);
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      Sauver
    `;
    btn.disabled = false;
  }
}

async function loadFromCloud() {
  const btn = document.getElementById('cloudLoadBtn');
  
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
    ...
  `;
  btn.disabled = true;
  
  try {
    const snapshot = await fichesRef.get();
    
    if (snapshot.empty) {
      showNotification('Aucune fiche dans le cloud');
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
        Charger
      `;
      btn.disabled = false;
      return;
    }
    
    fiches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    saveFiches();
    filteredFiches = getHomeFiches();
    renderCards();
    renderAdminList();
    updatePagination();
    
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      OK !
    `;
    
    showNotification(`${fiches.length} fiches chargées`);
    
    setTimeout(() => {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
        Charger
      `;
      btn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Erreur chargement:', error);
    showNotification('Erreur de chargement');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="1 4 1 10 7 10"></polyline>
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
      </svg>
      Charger
    `;
    btn.disabled = false;
  }
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    filteredFiches = currentFilter === 'all'
      ? getHomeFiches()
      : fiches.filter(f => f.type === currentFilter);
  } else {
    filteredFiches = (currentFilter === 'all' ? getHomeFiches() : fiches).filter(f => {
      const matchType = currentFilter === 'all' || f.type === currentFilter;
      const matchSearch =
        f.titre.toLowerCase().includes(query) ||
        f.societe.toLowerCase().includes(query) ||
        (f.resume && f.resume.toLowerCase().includes(query)) ||
        (f.villesConcernees && f.villesConcernees.some(v => v.toLowerCase().includes(query))) ||
        f.contenu.toLowerCase().includes(query);
      return matchType && matchSearch;
    });
  }
  currentPage = 0;
  renderCards();
  updatePagination();
}

function getHomeFiches() {
  return fiches.filter(function(f) { return f.type !== 'suivi'; });
}

function handleFilter(e) {
  currentFilter = e.target.value;

  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  
  if (currentFilter === 'all') {
    filteredFiches = getHomeFiches().filter(f => {
      const matchSearch = !query ||
        f.titre.toLowerCase().includes(query) ||
        f.societe.toLowerCase().includes(query) ||
        (f.resume && f.resume.toLowerCase().includes(query)) ||
        (f.villesConcernees && f.villesConcernees.some(v => v.toLowerCase().includes(query)));
      return matchSearch;
    });
  } else {
    filteredFiches = fiches.filter(f => {
      const matchType = f.type === currentFilter;
      const matchSearch = !query ||
        f.titre.toLowerCase().includes(query) ||
        f.societe.toLowerCase().includes(query) ||
        (f.resume && f.resume.toLowerCase().includes(query)) ||
        (f.villesConcernees && f.villesConcernees.some(v => v.toLowerCase().includes(query)));
      return matchType && matchSearch;
    });
  }
  
  currentPage = 0;
  renderCards();
  updatePagination();
}

function renderCards() {
  const container = document.getElementById('cardsContainer');

  if (filteredFiches.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path>
        </svg>
        <h3>Aucune fiche trouvée</h3>
        <p>Essayez de modifier votre recherche</p>
      </div>
    `;
    return;
  }

  // Group fiches by type, sort by priority within each group
  const grouped = {};
  filteredFiches.forEach(fiche => {
    if (!grouped[fiche.type]) {
      grouped[fiche.type] = [];
    }
    grouped[fiche.type].push(fiche);
  });

  // Sort each group by priority descending
  Object.keys(grouped).forEach(type => {
    grouped[type].sort(function(a, b) { return (b.priority || 0) - (a.priority || 0); });
  });

  const typeOrder = ['reglement', 'reforme', 'loi', 'plans-divers', 'suivi'];
  let html = '';
  
  typeOrder.forEach(type => {
    const fichesOfType = grouped[type];
    if (!fichesOfType) return;
    html += createStackHTML(fichesOfType, type);
  });

  container.innerHTML = html;

  container.querySelectorAll('.fiche-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });
}

function createStackHTML(fiches, type) {
  const color = fiches[0].couleur || colors[type] || '#0052A5';
  const label = typeLabels[type] || type;
  const count = fiches.length;
  const showCount = count;
  const extraCount = 0;

  const isMobile = window.innerWidth <= 480;
  const isSmall = window.innerWidth <= 360;
  const peekOffset = isSmall ? 40 : isMobile ? 45 : 50;
  const peekHeight = isSmall ? 100 : isMobile ? 110 : 110;
  
  const cardHeight = isSmall ? 420 : isMobile ? 460 : 500;
  const frontTop = (showCount - 1) * peekOffset;
  const wrapperHeight = frontTop + cardHeight;

  let cardsHTML = '';

  for (let i = 0; i < showCount; i++) {
    const fiche = fiches[i];
    const cardColor = fiche.couleur || colors[type] || '#0052A5';
    const isFront = (i === showCount - 1);
    const top = i * peekOffset;
    const zIndex = i + 1;
    const height = isFront ? cardHeight : peekHeight;

    cardsHTML += `
      <div class="fiche-card stack-card${isFront ? ' stack-card-front' : ''}" data-id="${fiche.id}"
           tabindex="0" role="button"
           aria-label="${escHtml(fiche.titre)} - ${escHtml(fiche.societe)}"
           style="top: ${top}px; z-index: ${zIndex}; height: ${height}px;${isFront ? '' : ' overflow: hidden;'}">
        <div class="fiche-top-bar" style="background: ${cardColor}"></div>
        <div class="fiche-image-container">
           <img class="fiche-image" src="${fiche.image}" alt="${escHtml(fiche.titre)}" loading="lazy" draggable="false"
                onerror="this.style.background='${cardColor}';this.alt=''">
          <span class="fiche-type-badge" style="background: ${cardColor}">${label}</span>
          <div class="fiche-title-overlay">
            <h2>${escHtml(fiche.titre)}</h2>
            <p class="overlay-societe">${escHtml(fiche.societe)}</p>
          </div>
        </div>
        ${isFront ? `
        <div class="fiche-body">
          <div class="fiche-societe">${escHtml(fiche.societe)}</div>
          <div class="fiche-divider"></div>
          <div class="fiche-resume">${fiche.resume || ''}</div>
          <div class="fiche-footer">
            <span class="fiche-date">${formatDate(fiche.dateMiseAJour)}</span>
            <div class="fiche-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" draggable="false">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>` : ''}
      </div>`;
  }

  return `
    <div class="stack-wrapper" data-type="${type}" style="height: ${wrapperHeight}px">
      ${cardsHTML}
    </div>
  `;
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function expandStack(type) {
  // Filter to show only fiches of this type
  const savedFilter = currentFilter;
  currentFilter = type;
  
  document.getElementById('filterSelect').value = type;
  
  filteredFiches = fiches.filter(f => f.type === type);
  renderCards();
  updatePagination();
  
  showNotification(`Fiches ${typeLabels[type] || type}`);
}

function createCardHTML(fiche) {
  const color = fiche.couleur || colors[fiche.type] || '#0052A5';
  const label = typeLabels[fiche.type] || fiche.type;

  return `
    <div class="fiche-card" data-id="${fiche.id}" tabindex="0" role="button" aria-label="${escHtml(fiche.titre)} - ${escHtml(fiche.societe)}">
      <div class="fiche-top-bar" style="background: ${color}"></div>
      <div class="fiche-image-container">
        <img class="fiche-image" src="${fiche.image}" alt="${escHtml(fiche.titre)}" loading="lazy" draggable="false"
             onerror="this.style.background='${color}';this.alt=''">
        <span class="fiche-type-badge" style="background: ${color}">${label}</span>
        <div class="fiche-title-overlay">
          <h2>${escHtml(fiche.titre)}</h2>
          <p class="overlay-societe">${escHtml(fiche.societe)}</p>
        </div>
      </div>
      <div class="fiche-body">
        <div class="fiche-societe">${escHtml(fiche.societe)}</div>
        <div class="fiche-divider"></div>
        <div class="fiche-resume">${fiche.resume || ''}</div>
        <div class="fiche-footer">
          <span class="fiche-date">${formatDate(fiche.dateMiseAJour)}</span>
          <div class="fiche-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" draggable="false">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  `;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function setupPagination() {
  updatePagination();
}

function updatePagination() {
  const pagination = document.getElementById('pagination');
  const total = filteredFiches.length;

  if (total <= 1) {
    pagination.innerHTML = '';
    return;
  }

  pagination.innerHTML = filteredFiches.map((_, i) =>
    `<div class="pagination-dot${i === currentPage ? ' active' : ''}"></div>`
  ).join('');

  pagination.querySelectorAll('.pagination-dot').forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const container = document.getElementById('cardsContainer');
      const cardWidth = container.children[0] ? container.children[0].offsetWidth + 24 : 336;
      window.scrollTo({ left: cardWidth * i, behavior: 'smooth' });
      currentPage = i;
      updatePagination();
    });
  });
}

function openModal(id) {
  const fiche = fiches.find(f => f.id === id);
  if (!fiche) return;

  if (fiche.type === 'suivi') {
    openSuiviModal(fiche);
  } else {
    openStandardModal(fiche);
  }
}

function openStandardModal(fiche) {
  const color = fiche.couleur || colors[fiche.type] || '#0052A5';
  const label = typeLabels[fiche.type] || fiche.type;

  const villesHTML = fiche.villesConcernees && fiche.villesConcernees.length > 0 ? `
    <div class="modal-villes">
      <div class="modal-villes-title">Villes concernées</div>
      <div class="modal-villes-list">
        ${fiche.villesConcernees.map(v => `<span class="ville-tag">${v}</span>`).join('')}
      </div>
    </div>
  ` : '';

  const pdfs = fiche.pdfs || [];
  const pdfHTML = pdfs.length > 0 ? `
    <div class="modal-pdfs">
      ${pdfs.map((pdf, i) => `
        <div class="modal-pdf">
          <div class="modal-pdf-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <div>
              <span>${escHtml(pdf.name)}</span>
              ${pdf.company ? `<div class="modal-pdf-company">${escHtml(pdf.company)}</div>` : ''}
            </div>
          </div>
          <div class="modal-pdf-actions">
            <a href="${pdf.data}" download="${pdf.name}" class="pdf-download-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Télécharger
            </a>
            <button onclick="previewPdfData('${fiche.id}', ${i})" class="pdf-preview-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Aperçu
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  ` : fiche.fichierPdf ? `
    <div class="modal-pdf">
      <div class="modal-pdf-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span>${fiche.pdfNom || 'Document PDF'}</span>
      </div>
      <div class="modal-pdf-actions">
        <a href="${fiche.fichierPdf}" download="${fiche.pdfNom || 'document.pdf'}" class="pdf-download-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Télécharger
        </a>
      </div>
    </div>
  ` : '';

  var standardInfosHTML = renderInfosCard(fiche.infos);
  var standardLinkHTML = renderExternalDocsSection(fiche.externalDocs);

  document.getElementById('modalContent').innerHTML = '\
    <img class="modal-image" src="' + fiche.image + '" alt="' + fiche.titre + '"\
         onerror="this.style.background=\'' + color + '\';this.style.height=\'220px\'">\
    <div class="modal-header">\
      <span class="modal-type-badge" style="background: ' + color + '">' + label + '</span>\
      <h2 class="modal-title">' + fiche.titre + '</h2>\
      <p class="modal-societe">' + fiche.societe + '</p>\
    </div>\
    <div class="modal-divider"></div>\
    <div style="text-align:right;padding:6px 0 0 0;">\
      <button onclick="exportFichePdf(fiches.find(f=>f.id===\'' + fiche.id + '\'))" style="background:transparent;border:1px solid ' + color + ';color:' + color + ';padding:5px 14px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;">⬇ Télécharger / Imprimer (PDF)</button>\
    </div>\
    <div class="modal-body">\
      ' + standardInfosHTML + '\
      ' + standardLinkHTML + '\
      ' + fiche.contenu + '\
      ' + renderLiensSection(fiche.liens) + '\
      ' + villesHTML + '\
      ' + pdfHTML + '\
    </div>\
    <div class="modal-date">\
      <img src="logo-slfp.png" alt="SLFP" style="height:20px;vertical-align:middle;margin-right:8px">\
      Créé le ' + formatDate(fiche.dateCreation) + ' · Mis à jour le ' + formatDate(fiche.dateMiseAJour) + '\
    </div>';

  document.getElementById('modal').className = 'modal';
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderInfosCard(infos) {
  if (!infos) return '';
  var rows = '';
  var infoFields = [
    { label: 'Statut juridique', key: 'statutJuridique' },
    { label: 'Forme juridique', key: 'formeJuridique' },
    { label: 'Siège social', key: 'siegeSocial' },
    { label: 'Date de création', key: 'dateCreation' },
    { label: 'Nombre d\'employés', key: 'nombreEmployes' },
    { label: 'Chiffre d\'affaires', key: 'chiffreAffaires' },
    { label: 'Communes associées', key: 'communesAssociees' },
    { label: 'Population desservie', key: 'populationDesservie' },
    { label: 'Superficie', key: 'superficieDesservie' },
    { label: 'N° BCE', key: 'numeroBCE' },
    { label: 'Bénéfice net', key: 'beneficeNet' },
    { label: 'Total actif', key: 'totalActif' },
    { label: 'Directeur général', key: 'directeurGeneral' },
    { label: 'Président CA', key: 'presidentCA' }
  ];
  for (var fi = 0; fi < infoFields.length; fi++) {
    var val = infos[infoFields[fi].key];
    if (val) {
      rows += '<tr><td class="suivi-info-label">' + infoFields[fi].label + '</td><td class="suivi-info-value">' + escHtml(val) + '</td></tr>';
    }
  }
  if (!rows) return '';
  var html = '<div class="suivi-info-card"><table class="suivi-info-table">' + rows + '</table>';
  if (infos.activites && infos.activites.length > 0) {
    html += '<div class="suivi-info-section"><div class="suivi-info-section-title">Activités</div><ul class="suivi-info-list">';
    for (var ai = 0; ai < infos.activites.length; ai++) {
      html += '<li>' + escHtml(infos.activites[ai]) + '</li>';
    }
    html += '</ul></div>';
  }
  if (infos.sousStructures && infos.sousStructures.length > 0) {
    html += '<div class="suivi-info-section"><div class="suivi-info-section-title">Sous-structures</div><ul class="suivi-info-list">';
    for (var si = 0; si < infos.sousStructures.length; si++) {
      html += '<li>' + escHtml(infos.sousStructures[si]) + '</li>';
    }
    html += '</ul></div>';
  }
  html += '</div>';
  return html;
}

function renderPdfLink(link, nom) {
  if (!link) return '';
  var displayName = nom || 'Ouvrir le document PDF';
  return '<a href="' + escHtml(link) + '" target="_blank" class="suivi-pdf-link">📄 ' + escHtml(displayName) + '</a>';
}

function renderExternalDocsSection(externalDocs) {
  if (!externalDocs || externalDocs.length === 0) return '';
  var html = '<div class="external-docs-section"><h3 class="liens-title">📄 Documents externes</h3>';
  for (var i = 0; i < externalDocs.length; i++) {
    var d = externalDocs[i];
    if (!d.url) continue;
    html += '<a href="' + escHtml(d.url) + '" target="_blank" class="suivi-pdf-link">📄 ' + escHtml(d.nom || d.url) + '</a>';
  }
  html += '</div>';
  return html;
}

function renderLiensSection(liens) {
  if (!liens || liens.length === 0) return '';
  var html = '<div class="liens-section"><h3 class="liens-title">🔗 Liens utiles</h3><ul class="liens-list">';
  for (var i = 0; i < liens.length; i++) {
    var l = liens[i];
    if (!l.url) continue;
    html += '<li><a href="' + escHtml(l.url) + '" target="_blank" rel="noopener">' + escHtml(l.nom || l.url) + '</a></li>';
  }
  html += '</ul></div>';
  return html;
}

function exportFichePdf(fiche) {
  if (!fiche) return;
  var color = fiche.couleur || colors[fiche.type] || '#0052A5';
  var label = typeLabels[fiche.type] || fiche.type;
  var villes = Array.isArray(fiche.villesConcernees) ? fiche.villesConcernees.join(', ') : '';
  var dateTxt = '';
  if (fiche.dateCreation) dateTxt += 'Création : ' + fiche.dateCreation;
  if (fiche.dateMiseAJour) dateTxt += (dateTxt ? ' | ' : '') + 'Mise à jour : ' + fiche.dateMiseAJour;
  var pdfLinksHtml = '';
  if (fiche.pdfs && fiche.pdfs.length > 0) {
    fiche.pdfs.forEach(function(p) {
      pdfLinksHtml += '<a href="' + escHtml(p.url || p.lien || p) + '" target="_blank" style="display:inline-block;margin:4px 8px 4px 0;padding:6px 14px;background:#0052A5;color:#fff;text-decoration:none;border-radius:4px;font-size:11px;">Télécharger le document</a>';
    });
  }
  if (fiche.externalDocs && fiche.externalDocs.length > 0) {
    fiche.externalDocs.forEach(function(d) {
      if (d.url) pdfLinksHtml += '<a href="' + escHtml(d.url) + '" target="_blank" style="display:inline-block;margin:4px 8px 4px 0;padding:6px 14px;background:#DC2626;color:#fff;text-decoration:none;border-radius:4px;font-size:11px;">' + escHtml(d.nom || d.url) + '</a>';
    });
  }
  var liensHtml = '';
  if (fiche.liens && fiche.liens.length > 0) {
    liensHtml = '<h3>Liens utiles</h3><ul style="list-style:none;padding:0;">';
    fiche.liens.forEach(function(l) {
      if (l.url) liensHtml += '<li style="margin:4px 0;"><a href="' + escHtml(l.url) + '" target="_blank" style="color:#2563EB;text-decoration:none;">' + escHtml(l.nom || l.url) + '</a></li>';
    });
    liensHtml += '</ul>';
  }
  var infos = fiche.infos || (getSampleInfos ? getSampleInfos()[fiche.id] : null);
  var infosHtml = infos ? renderInfosCard(infos) : '';
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><title>' + escHtml(fiche.titre) + '</title><style>\
    @page { margin: 18mm 15mm; }\
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.5; }\
    .header { border-bottom: 3px solid ' + color + '; padding-bottom: 12px; margin-bottom: 20px; }\
    .badge { display: inline-block; background: ' + color + '; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }\
    h1 { font-size: 22px; margin: 6px 0 2px 0; }\
    h2 { font-size: 14px; color: #555; font-weight: 400; margin: 0 0 4px 0; }\
    h3 { font-size: 15px; color: ' + color + '; margin: 20px 0 8px 0; border-bottom: 1px solid #ddd; padding-bottom: 4px; }\
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }\
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 11px; }\
    th { background: #f3f4f6; font-weight: bold; }\
    ul { margin: 6px 0; padding-left: 20px; }\
    li { margin: 3px 0; font-size: 12px; }\
    p { margin: 6px 0; }\
    .meta { font-size: 11px; color: #888; margin-top: 4px; }\
    .footer { margin-top: 30px; font-size: 10px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 8px; text-align: center; }\
    .btn { display: none; }\
    a { color: ' + color + '; }\
    @media print { .no-print { display: none; } }\
  </style></head><body>\
    <div class="header">\
      <div class="badge">' + escHtml(label) + '</div>\
      <h1>' + escHtml(fiche.titre) + '</h1>\
      <h2>' + escHtml(fiche.societe || '') + '</h2>\
      <div class="meta">' + escHtml(dateTxt) + '</div>\
      <div class="meta">' + escHtml(villes) + '</div>\
    </div>\
    ' + infosHtml + '\
    <div style="margin-top:16px;">' + fiche.contenu + '</div>\
    ' + (pdfLinksHtml ? '<div style="margin-top:20px;"><h3>Documents</h3>' + pdfLinksHtml + '</div>' : '') + '\
    ' + (liensHtml ? '<div style="margin-top:16px;">' + liensHtml + '</div>' : '') + '\
    <div class="footer">Document généré le ' + new Date().toLocaleDateString('fr-BE') + ' — SLFP</div>\
    <script>window.onload = function(){ window.print(); };<' + '/script>\
  </body></html>');
  w.document.close();
}

// ========== SUIVI MODAL ==========

function openSuiviModal(fiche, activeTab) {
  const color = fiche.couleur || colors[fiche.type] || '#0891B2';
  const label = typeLabels[fiche.type] || 'Suivi';
  activeTab = activeTab || 'info';

  const tabs = ['info', 'cppt', 'qualite', 'spf'];
  const tabLabels = ['Info', 'CPPT', 'Qualité Bâtiments', 'SPF Bien-être'];
  const tabContents = [suiviInfoContent(fiche), suiviCpptContent(fiche), suiviQualiteContent(fiche), suiviSpfContent(fiche)];

  var tabsHtml = '';
  var contentsHtml = '';
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    var activeClass = t === activeTab ? ' active' : '';
    var count = 0;
    if (t === 'cppt') count = (fiche.cppt && fiche.cppt.reunions) ? fiche.cppt.reunions.length : 0;
    else if (t === 'qualite') count = (fiche.qualiteBatiments && fiche.qualiteBatiments.visites) ? fiche.qualiteBatiments.visites.length : 0;
    else if (t === 'spf') count = (fiche.spfBienEtre && fiche.spfBienEtre.inspections) ? fiche.spfBienEtre.inspections.length : 0;
    var badgeHtml = count > 0 ? ' <span class="suivi-tab-badge">' + count + '</span>' : '';
    tabsHtml += '<button class="suivi-tab' + activeClass + '" onclick="switchSuiviTab(this,\'' + t + '\')">' + tabLabels[i] + badgeHtml + '</button>';
    contentsHtml += '<div class="suivi-tab-content' + activeClass + '" id="suivi-tab-' + t + '">' + tabContents[i] + '</div>';
  }

  document.getElementById('modal').className = 'modal modal-suivi';
  var logoHtml = fiche.logo ? '<img src="' + fiche.logo + '" alt="' + fiche.societe + '" class="suivi-logo-corner">' : '';
  var saveBtnHtml = '<button class="suivi-save-btn" onclick="saveSuiviInfo(\'' + fiche.id + '\')" title="Enregistrer">💾 Enregistrer</button>';
  var exportBlankHtml = '<button class="suivi-export-blank-btn" onclick="exportBlankSuiviPdf(\'' + fiche.id + '\')" title="Exporter le formulaire vierge en PDF">🖨</button>';
  document.getElementById('modalContent').innerHTML =
    '<div class="suivi-header-compact" style="background:linear-gradient(135deg, ' + color + '11 0%, ' + color + '22 100%);border-bottom-color:' + color + '44;">' +
      '<div class="suivi-header-info" style="display:flex;flex-direction:column;">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span class="modal-type-badge" style="background: ' + color + '">' + label + '</span>' +
          saveBtnHtml +
          exportBlankHtml +
        '</div>' +
        '<h2 class="modal-title">' + fiche.titre + '</h2>' +
        '<p class="modal-societe">' + fiche.societe + '</p>' +
      '</div>' +
      logoHtml +
    '</div>' +
    '<div class="modal-divider" style="margin-top:0;"></div>' +
    '<div class="suivi-tabs">' + tabsHtml + '</div>' +
    contentsHtml +
    '<div class="modal-date">' +
      '<img src="logo-slfp.png" alt="SLFP" style="height:20px;vertical-align:middle;margin-right:8px">' +
      ('Créé le ' + formatDate(fiche.dateCreation) + ' · Mis à jour le ' + formatDate(fiche.dateMiseAJour)) +
    '</div>';

  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function switchSuiviTab(btn, tabId) {
  document.querySelectorAll('.suivi-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.suivi-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById('suivi-tab-' + tabId);
  if (el) el.classList.add('active');
}

function getSuiviData(fiche) {
  if (!fiche.cppt) fiche.cppt = { reunions: [] };
  if (!fiche.qualiteBatiments) fiche.qualiteBatiments = { visites: [] };
  if (!fiche.spfBienEtre) fiche.spfBienEtre = { inspections: [] };
  return fiche;
}

function saveFicheField(ficheId, key, value) {
  const fiche = fiches.find(f => f.id === ficheId);
  if (!fiche) { showNotification('Erreur : fiche introuvable'); return; }
  fiche[key] = value;
  fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
  try {
    saveFiches();
    showNotification('Enregistré');
  } catch(e) {
    console.error('Erreur saveFiches:', e);
    showNotification('Erreur de sauvegarde');
  }
}

// ========== TAB: INFO ==========

function suiviInfoContent(fiche) {
  var villesHTML = fiche.villesConcernees && fiche.villesConcernees.length > 0 ? '\
    <div class="modal-villes">\
      <div class="modal-villes-title">Villes concernées</div>\
      <div class="modal-villes-list">\
        ' + fiche.villesConcernees.map(function(v) { return '<span class="ville-tag">' + v + '</span>'; }).join('') + '\
      </div>\
    </div>' : '';

  var id = fiche.id;
  var infosHTML = renderInfosCard(fiche.infos);

  // Pdfs annexes
  var pdfs = fiche.pdfs || [];
  var docsHTML = '';
  if (pdfs.length > 0) {
    docsHTML = '<div class="suivi-section"><h4 class="suivi-section-title">📎 Documents</h4>';
    docsHTML += pdfs.map(function(pdf, i) { return '\
      <div class="modal-pdf">\
        <div class="modal-pdf-title">\
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>\
          <div>\
            <span>' + escHtml(pdf.name) + '</span>\
            ' + (pdf.company ? '<div class="modal-pdf-company">' + escHtml(pdf.company) + '</div>' : '') + '\
          </div>\
        </div>\
        <div class="modal-pdf-actions">\
          <a href="' + pdf.data + '" download="' + pdf.name + '" class="pdf-download-btn">\
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>\
            Télécharger\
          </a>\
          <button onclick="previewPdfData(\'' + fiche.id + '\', ' + i + ')" class="pdf-preview-btn">\
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>\
            Aperçu\
          </button>\
        </div>\
      </div>'; }).join('');
    docsHTML += '</div>';
  }

  var externalDocsHTML = renderExternalDocsSection(fiche.externalDocs);

  return '\
    <div class="modal-body" style="padding:0;">\
      <div class="suivi-info-fields">\
        <div class="suivi-info-field">\
          <label>Titre</label>\
          <input type="text" id="suivi-edit-titre-' + id + '" value="' + escHtml(fiche.titre) + '" class="suivi-info-input">\
        </div>\
        <div class="suivi-info-field">\
          <label>Société</label>\
          <input type="text" id="suivi-edit-societe-' + id + '" value="' + escHtml(fiche.societe) + '" class="suivi-info-input">\
        </div>\
      </div>\
      ' + infosHTML + '\
      ' + docsHTML + '\
      <div class="suivi-section"><h4 class="suivi-section-title">📄 Contenu</h4><div style="margin-top:6px;">' + fiche.contenu + '</div></div>\
      <div style="font-size:0.75rem;color:#6B7280;margin:12px 0;display:flex;gap:12px;flex-wrap:wrap;">\
        <span>Créé le ' + formatDate(fiche.dateCreation) + '</span>\
        <span>· Mis à jour le ' + formatDate(fiche.dateMiseAJour) + '</span>\
      </div>\
      ' + villesHTML + '\
      ' + renderLiensSection(fiche.liens) + '\
      ' + externalDocsHTML + '\
    </div>';
}

function saveSuiviInfo(id) {
  var titre = document.getElementById('suivi-edit-titre-' + id).value.trim();
  var societe = document.getElementById('suivi-edit-societe-' + id).value.trim();
  if (!titre) { showNotification('Le titre ne peut pas être vide'); return; }
  var fiche = fiches.find(function(f) { return f.id === id; });
  if (!fiche) return;
  fiche.titre = titre;
  fiche.societe = societe || fiche.societe;
  fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
  if (useFirebase) {
    saveFicheToFirebase(fiche).catch(function(e) { console.error('Firebase save (best-effort) failed:', e); });
  }
  saveFiches();
  updateRoiButtons();
  // Update the header in the modal
  var header = document.querySelector('.suivi-header-info');
  if (header) {
    var titleEl = header.querySelector('h2');
    var socEl = header.querySelector('p');
    if (titleEl) titleEl.textContent = titre;
    if (socEl) socEl.textContent = societe || fiche.societe;
  }
  showNotification('Fiche mise à jour');
}

// ========== TAB: CPPT ==========

function suiviCpptContent(fiche) {
  getSuiviData(fiche);
  const reunions = fiche.cppt.reunions || [];

  let rows = '';
  if (reunions.length === 0) {
    rows = '<tr><td colspan="4" style="text-align:center;color:#9CA3AF;padding:20px;">Aucune réunion CPPT enregistrée</td></tr>';
  } else {
    reunions.forEach((r, i) => {
      const hasPdf = r.pdfs && r.pdfs.length > 0;
      const pdfIcons = hasPdf ? r.pdfs.map((p, pi) => `<a href="${p.data}" download="${p.name}" title="${escHtml(p.name)}" style="display:inline-flex;align-items:center;color:#059669;text-decoration:none;font-size:0.7rem;margin-right:3px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></a>`).join('') : '';
      rows += `<tr>
        <td style="white-space:nowrap;vertical-align:middle;">${r.date || '-'}</td>
        <td style="vertical-align:middle;"><div style="font-size:0.75rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(r.ordreJour || '')}">${escHtml(r.ordreJour || '-')}</div></td>
        <td style="vertical-align:middle;"><div style="font-size:0.75rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(r.decisions || '')}">${escHtml(r.decisions || '-')}</div></td>
        <td style="vertical-align:middle;text-align:right;white-space:nowrap;">
          ${pdfIcons}
          <button class="btn-action pdf" style="min-width:52px;" onclick="uploadCpptPdf('${fiche.id}',${i})" title="Ajouter PDF">+ PDF</button>
          <button class="btn-action edit" style="min-width:80px;" onclick="editCpptReunion('${fiche.id}',${i})" title="Modifier">✎ Modifier</button>
          <button class="btn-action delete" style="min-width:70px;" onclick="deleteCpptReunion('${fiche.id}',${i})" title="Supprimer">✕ Suppr.</button>
        </td>
      </tr>`;
    });
  }

  return `
    <div style="display:flex;align-items:flex-end;margin-bottom:12px;gap:8px;flex-wrap:wrap;">
      <button class="btn-add" onclick="addCpptReunion('${fiche.id}')">+ Ajouter réunion</button>
      <div style="margin-left:auto;display:flex;gap:6px;">
        <button class="btn-export" onclick="exportBlankSectionPdf('${fiche.id}','cppt')">Vierge</button>
        <button class="btn-export" onclick="exportSectionPdf('${fiche.id}','cppt')">Export PDF</button>
      </div>
    </div>
    <table>
      <thead><tr><th class="sortable" tabindex="0" aria-sort="none" scope="col">Date</th><th class="sortable" tabindex="0" aria-sort="none" scope="col">Ordre du jour</th><th class="sortable" tabindex="0" aria-sort="none" scope="col">Décisions</th><th scope="col">Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ========== A4 POPUP UTILITY ==========

function showA4Popup(config) {
  var existing = document.querySelector('.a4-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.className = 'a4-overlay';

  overlay.innerHTML =
    '<div class="a4-modal">' +
      '<div class="a4-header">' +
        '<h3>' + escHtml(config.title) + '</h3>' +
        '<button class="a4-close" onclick="this.closest(\'.a4-overlay\').remove()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 6 6 18M6 6l12 12"></path></svg>' +
        '</button>' +
      '</div>' +
      '<div class="a4-body">' + config.bodyHtml + '</div>' +
      '<div class="a4-footer">' +
        '<button class="a4-btn a4-btn-secondary" onclick="this.closest(\'.a4-overlay\').remove()">Annuler</button>' +
        '<button class="a4-btn a4-btn-primary" id="a4-save-btn">' + (config.saveLabel || 'Enregistrer') + '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  document.getElementById('a4-save-btn').addEventListener('click', function() {
    try {
      var result = config.onSave();
      if (result !== false) {
        overlay.remove();
      }
    } catch(e) {
      console.error('Erreur lors de la sauvegarde:', e);
      alert('Erreur : ' + e.message);
    }
  });
}

function addCpptReunion(ficheId) {
  var fiche = fiches.find(function(f) { return f.id === ficheId; });
  if (!fiche) return;
  getSuiviData(fiche);

  var today = new Date().toISOString().split('T')[0];
  var html =
    '<div class="a4-field">' +
      '<label>Date de la réunion</label>' +
      '<input type="date" id="a4-cppt-date" value="' + today + '">' +
    '</div>' +
    '<div class="a4-field">' +
      '<label>Ordre du jour <span style="color:#9CA3AF;font-weight:400;">(un sujet par ligne)</span></label>' +
      '<textarea id="a4-cppt-ordre" rows="5" placeholder="Collez ici les points de l\'ordre du jour..."></textarea>' +
    '</div>' +
    '<div class="a4-field">' +
      '<label>Décisions prises</label>' +
      '<textarea id="a4-cppt-decisions" rows="4" placeholder="Décisions et remarques..."></textarea>' +
    '</div>';

  showA4Popup({
    title: 'Nouvelle réunion CPPT - ' + fiche.societe,
    bodyHtml: html,
    saveLabel: 'Ajouter la réunion',
    onSave: function() {
      var date = document.getElementById('a4-cppt-date').value;
      var ordreJour = document.getElementById('a4-cppt-ordre').value;
      var decisions = document.getElementById('a4-cppt-decisions').value;
      if (!date) { alert('Veuillez entrer une date.'); return false; }
      fiche.cppt.reunions.push({ date: date, ordreJour: ordreJour, decisions: decisions, pdfs: [] });
      fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
      saveFiches();
      showNotification('Réunion ajoutée');
      openSuiviModal(fiche, 'cppt');
    }
  });
}

function editCpptReunion(ficheId, index) {
  var fiche = fiches.find(function(f) { return f.id === ficheId; });
  if (!fiche) return;
  var r = fiche.cppt.reunions[index];
  if (!r) return;

  var html =
    '<div class="a4-field">' +
      '<label>Date de la réunion</label>' +
      '<input type="date" id="a4-cppt-date" value="' + (r.date || '') + '">' +
    '</div>' +
    '<div class="a4-field">' +
      '<label>Ordre du jour <span style="color:#9CA3AF;font-weight:400;">(un sujet par ligne)</span></label>' +
      '<textarea id="a4-cppt-ordre" rows="5">' + escHtml(r.ordreJour || '') + '</textarea>' +
    '</div>' +
    '<div class="a4-field">' +
      '<label>Décisions prises</label>' +
      '<textarea id="a4-cppt-decisions" rows="4">' + escHtml(r.decisions || '') + '</textarea>' +
    '</div>';

  showA4Popup({
    title: 'Modifier la réunion CPPT - ' + fiche.societe,
    bodyHtml: html,
    saveLabel: 'Enregistrer',
    onSave: function() {
      var date = document.getElementById('a4-cppt-date').value;
      var ordreJour = document.getElementById('a4-cppt-ordre').value;
      var decisions = document.getElementById('a4-cppt-decisions').value;
      if (!date) { alert('Veuillez entrer une date.'); return false; }
      r.date = date; r.ordreJour = ordreJour; r.decisions = decisions;
      fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
      saveFiches();
      showNotification('Réunion modifiée');
      openSuiviModal(fiche, 'cppt');
    }
  });
}

function uploadCpptPdf(ficheId, index) {
  uploadSuiviPdf(ficheId, 'cppt', index);
}
function uploadSuiviPdf(ficheId, section, index) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_BASE64_MB = 0.8;
    if (file.size > MAX_BASE64_MB * 1024 * 1024 && !useFirebase) {
      showNotification('Fichier > ' + MAX_BASE64_MB + ' Mo : le quota localStorage sera dépassé. Activez Firebase ou réduisez le PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async function(ev) {
      const fiche = fiches.find(f => f.id === ficheId);
      if (!fiche) return;
      getSuiviData(fiche);

      var parent;
      var tab;
      if (section === 'cppt') { parent = fiche.cppt.reunions[index]; tab = 'cppt'; }
      else if (section === 'qualite') { parent = fiche.qualiteBatiments.visites[index]; tab = 'qualite'; }
      else if (section === 'spf') { parent = fiche.spfBienEtre.inspections[index]; tab = 'spf'; }
      if (!parent) return;
      if (!parent.pdfs) parent.pdfs = [];

      if (useFirebase) {
        try {
          var result = await uploadPDFToFirebase(file, ficheId + '_' + section + '_' + index);
          if (result) {
            parent.pdfs.push({ name: result.name, data: result.url });
            fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
            if (saveFiches()) {
              showNotification('PDF ajouté (Firebase)');
              openSuiviModal(fiche, tab);
              return;
            }
          }
        } catch (e) {
          console.error('Firebase upload failed, fallback to base64:', e);
        }
      }

      parent.pdfs.push({ name: file.name, data: ev.target.result });
      fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
      if (saveFiches()) {
        showNotification('PDF ajouté');
      } else {
        parent.pdfs.pop();
        showNotification('Erreur : sauvegarde impossible (PDF trop volumineux)');
        return;
      }
      openSuiviModal(fiche, tab);
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ========== TAB: QUALITÉ BÂTIMENTS ==========

function suiviQualiteContent(fiche) {
  getSuiviData(fiche);
  const visites = fiche.qualiteBatiments.visites || [];

  let html = '';
  if (visites.length === 0) {
    html = '<p style="color:#9CA3AF;text-align:center;padding:20px;">Aucune visite communale enregistrée</p>';
  } else {
    visites.forEach((v, vi) => {
      const itemsChecklist = (v.items || []).map((item, ii) => `
        <div class="checklist-item">
          <input type="checkbox" ${item.ok ? 'checked' : ''} disabled>
          <div style="flex:1">
            <div class="item-label">${escHtml(item.label)}</div>
            ${item.remarque ? `<div style="font-size:0.75rem;color:#6B7280;">${escHtml(item.remarque)}</div>` : ''}
          </div>
        </div>
      `).join('');

      const hasPdf = v.pdfs && v.pdfs.length > 0;
      const pdfIcons = hasPdf ? v.pdfs.map(p => `<a href="${p.data}" download="${p.name}" title="${escHtml(p.name)}" style="display:inline-flex;align-items:center;color:#059669;text-decoration:none;font-size:0.7rem;margin-right:2px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></a>`).join('') : '';

      html += `
        <div style="margin-bottom:16px;padding:12px;background:#F9FAFB;border-radius:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:4px;">
            <strong style="font-size:0.85rem;">${v.date || '-'} — ${escHtml(v.batiment || 'Bâtiment')}</strong>
            <div style="display:inline-flex;align-items:center;gap:4px;">
              ${pdfIcons}
              <button class="btn-action pdf" style="min-width:52px;" onclick="uploadQualitePdf('${fiche.id}',${vi})" title="Ajouter PDF">+ PDF</button>
              <button class="btn-action edit" style="min-width:80px;" onclick="editQualiteVisite('${fiche.id}',${vi})" title="Modifier">✎ Modifier</button>
              <button class="btn-action delete" style="min-width:70px;" onclick="deleteQualiteVisite('${fiche.id}',${vi})" title="Supprimer">✕ Suppr.</button>
            </div>
          </div>
          ${itemsChecklist}
        </div>
      `;
    });
  }

  return `
    <div style="display:flex;align-items:flex-end;margin-bottom:12px;gap:8px;flex-wrap:wrap;">
      <button class="btn-add" onclick="addQualiteVisite('${fiche.id}')">+ Nouvelle visite</button>
      <div style="margin-left:auto;display:flex;gap:6px;">
        <button class="btn-export" onclick="exportBlankSectionPdf('${fiche.id}','qualite')">Vierge</button>
        <button class="btn-export" onclick="exportSectionPdf('${fiche.id}','qualite')">Export PDF</button>
      </div>
    </div>
    ${html}
  `;
}

const QUALITE_ITEMS = [
  'Toiture et étanchéité',
  'Façades et menuiseries (portes, fenêtres)',
  'Électricité et éclairage',
  'Chauffage et ventilation',
  'Plomberie et sanitaires',
  'Sécurité incendie (extincteurs, issues, alarme)',
  'Accessibilité PMR (rampes, ascenseurs, sanitaires)',
  'Ascenseurs et monte-charges',
  'Espaces extérieurs (parking, abords, éclairage)',
  'Propreté et entretien général',
  'Signalétique intérieure et extérieure',
  'État des peintures et revêtements (sols, murs)',
  'Menuiserie extérieure (portes d\'entrée, fenêtres)',
  'Climatisation et qualité de l\'air intérieur',
  'Installation de gaz (détecteurs, conduits)',
  'Système de vidéosurveillance et contrôle d\'accès',
  'Paratonnerre et mise à la terre',
  'Ascenseur et nacelle (entretien, conformité)',
  'Toiture terrasse et évacuation des eaux pluviales',
  'Zone de stockage et locaux techniques',
  'Cuisine collective et réfectoire (hygiène, équipements)',
  'Aires de jeux et équipements sportifs',
  'Éclairage de sécurité et blocs autonomes (BAES)',
  'Groupes électrogènes et alimentation de secours'
];

function addQualiteVisite(ficheId) {
  var fiche = fiches.find(function(f) { return f.id === ficheId; });
  if (!fiche) return;
  getSuiviData(fiche);

  var today = new Date().toISOString().split('T')[0];
  var itemsHtml = '';
  for (var qi = 0; qi < QUALITE_ITEMS.length; qi++) {
    itemsHtml +=
      '<div class="a4-check-item">' +
        '<input type="checkbox" id="q-ok-' + qi + '" checked>' +
        '<div style="flex:1">' +
          '<div class="a4-check-label">' + escHtml(QUALITE_ITEMS[qi]) + '</div>' +
          '<input class="a4-check-remarque" id="q-rem-' + qi + '" placeholder="Remarque...">' +
        '</div>' +
      '</div>';
  }

  var html =
    '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">' +
      '<div class="a4-field" style="flex:1;min-width:150px;">' +
        '<label>Date de la visite</label>' +
        '<input type="date" id="q-date" value="' + today + '">' +
      '</div>' +
      '<div class="a4-field" style="flex:2;min-width:200px;">' +
        '<label>Bâtiment visité</label>' +
        '<input id="q-batiment" placeholder="Nom du bâtiment">' +
      '</div>' +
    '</div>' +
    '<h4 style="margin:0 0 12px 0;">Checklist — cocher si conforme</h4>' +
    itemsHtml;

  showA4Popup({
    title: 'Nouvelle visite Qualité Bâtiments - ' + fiche.societe,
    bodyHtml: html,
    saveLabel: 'Enregistrer la visite',
    onSave: function() {
      var date = document.getElementById('q-date').value;
      var batiment = document.getElementById('q-batiment').value;
      if (!date || !batiment) { alert('Veuillez remplir la date et le bâtiment.'); return false; }
      var items = [];
      for (var i = 0; i < QUALITE_ITEMS.length; i++) {
        items.push({
          label: QUALITE_ITEMS[i],
          ok: document.getElementById('q-ok-' + i).checked,
          remarque: document.getElementById('q-rem-' + i).value
        });
      }
      fiche.qualiteBatiments.visites.push({ date: date, batiment: batiment, items: items, pdfs: [] });
      fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
      saveFiches();
      showNotification('Visite ajoutée');
      openSuiviModal(fiche, 'qualite');
    }
  });
}

function editQualiteVisite(ficheId, index) {
  var fiche = fiches.find(function(f) { return f.id === ficheId; });
  if (!fiche) return;
  var v = fiche.qualiteBatiments.visites[index];
  if (!v) return;

  var itemsHtml = '';
  for (var qi = 0; qi < QUALITE_ITEMS.length; qi++) {
    var item = v.items && v.items[qi] ? v.items[qi] : { label: QUALITE_ITEMS[qi], ok: false, remarque: '' };
    itemsHtml +=
      '<div class="a4-check-item">' +
        '<input type="checkbox" id="q-ok-' + qi + '" ' + (item.ok ? 'checked' : '') + '>' +
        '<div style="flex:1">' +
          '<div class="a4-check-label">' + escHtml(QUALITE_ITEMS[qi]) + '</div>' +
          '<input class="a4-check-remarque" id="q-rem-' + qi + '" value="' + escHtml(item.remarque || '') + '" placeholder="Remarque...">' +
        '</div>' +
      '</div>';
  }

  var html =
    '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">' +
      '<div class="a4-field" style="flex:1;min-width:150px;">' +
        '<label>Date de la visite</label>' +
        '<input type="date" id="q-date" value="' + (v.date || '') + '">' +
      '</div>' +
      '<div class="a4-field" style="flex:2;min-width:200px;">' +
        '<label>Bâtiment visité</label>' +
        '<input id="q-batiment" value="' + escHtml(v.batiment || '') + '">' +
      '</div>' +
    '</div>' +
    '<h4 style="margin:0 0 12px 0;">Checklist — cocher si conforme</h4>' +
    itemsHtml;

  showA4Popup({
    title: 'Modifier la visite - ' + fiche.societe,
    bodyHtml: html,
    onSave: function() {
      var date = document.getElementById('q-date').value;
      var batiment = document.getElementById('q-batiment').value;
      if (!date || !batiment) { alert('Veuillez remplir la date et le bâtiment.'); return false; }
      v.date = date;
      v.batiment = batiment;
      for (var i = 0; i < QUALITE_ITEMS.length; i++) {
        if (!v.items[i]) v.items[i] = { label: QUALITE_ITEMS[i], ok: false, remarque: '' };
        v.items[i].ok = document.getElementById('q-ok-' + i).checked;
        v.items[i].remarque = document.getElementById('q-rem-' + i).value;
      }
      fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
      saveFiches();
      showNotification('Visite modifiée');
      openSuiviModal(fiche, 'qualite');
    }
  });
}

function deleteQualiteVisite(ficheId, index) {
  if (!confirm('Supprimer cette visite ?')) return;
  const fiche = fiches.find(f => f.id === ficheId);
  if (!fiche) return;
  fiche.qualiteBatiments.visites.splice(index, 1);
  fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
  saveFiches();
  showNotification('Visite supprimée');
  openSuiviModal(fiche, 'qualite');
}

function uploadQualitePdf(ficheId, index) {
  uploadSuiviPdf(ficheId, 'qualite', index);
}

// ========== TAB: SPF BIEN-ÊTRE ==========

const SPF_SECTIONS = [
  { label: 'Éclairage et ambiance lumineuse', items: ['Éclairage général suffisant', 'Éclairage de secours opérationnel', 'Absence d\'éblouissement', 'Éclairage naturel suffisant', 'Luminaires en bon état', 'Commandes d\'éclairage accessibles'] },
  { label: 'Chauffage et confort thermique', items: ['Température conforme (18-22°C)', 'Chauffage fonctionnel', 'Absence de courants d\'air', 'Humidité contrôlée', 'Thermostats accessibles et réglables', 'Isolation thermique des locaux', 'Ventilation mécanique contrôlée (VMC)'] },
  { label: 'Hygiène et sanitaires', items: ['Toilettes propres et approvisionnés', 'Lavabos et eau courante', 'Produits hygiéniques disponibles', 'Savon et essuie-mains présents', 'Poubelles vidées régulièrement', 'Eau chaude disponible', 'Nettoyage régulier des locaux', 'Produits d\'entretien adaptés et sécurisés'] },
  { label: 'Sécurité incendie', items: ['Extincteurs visibles et valides', 'Issues de secours dégagées', 'Alarme fonctionnelle', 'Plan d\'évacuation affiché', 'Exercices d\'évacuation réalisés', 'Détecteurs de fumée/fumée opérationnels', 'Portes coupe-feu en état', 'Consignes de sécurité affichées'] },
  { label: 'Ergonomie et mobilier', items: ['Postes de travail adaptés', 'Chaises ergonomiques', 'Écrans réglables', 'Repose-pieds disponibles', 'Plans de travail réglables', 'Éclairage individuel de bureau', 'Supports pour documents', 'Espaces de rangement adéquats'] },
  { label: 'Électricité', items: ['Prises en bon état', 'Câbles rangés/sécurisés', 'Aucune surcharge visible', 'Tableau électrique accessible', 'Disjoncteurs correctement étiquetés', 'Câbles hors des zones de passage', 'Multiprises avec interrupteur'] },
  { label: 'Produits dangereux', items: ['Produits étiquetés', 'Fiches de données de sécurité disponibles', 'Stockage conforme', 'Armoire de sécurité fermée à clé', 'Kit anti-déversement disponible', 'Formation du personnel aux risques chimiques'] },
  { label: 'Bruit et nuisances sonores', items: ['Niveau sonore acceptable', 'Isolation phonique des cloisons', 'Zones de silence ou calme disponibles', 'Écrans anti-bruit si nécessaire', 'Casques ou protections auditives disponibles'] },
  { label: 'Aspects psycho-sociaux', items: ['Enquête psycho-sociale réalisée auprès des agents', 'Analyse des risques psycho-sociaux effectuée', 'Personne de confiance désignée', 'Procédure de signalement connue des agents', 'Entretiens individuels réguliers avec la hiérarchie', 'Aménagement du temps de travail possible', 'Accès à un service de santé au travail', 'Prévention du harcèlement (formation, affichage)', 'Soutien psychologique disponible'] }
];

function suiviSpfContent(fiche) {
  getSuiviData(fiche);
  const inspections = fiche.spfBienEtre.inspections || [];

  let html = '';
  if (inspections.length === 0) {
    html = '<p style="color:#9CA3AF;text-align:center;padding:20px;">Aucune inspection SPF Bien-être enregistrée</p>';
  } else {
    inspections.forEach((insp, vi) => {
      let sectionsHtml = '';
      (insp.sections || []).forEach(sec => {
        const itemsHtml = (sec.items || []).map(item => `
          <div class="checklist-item">
            <span class="${item.conforme ? 'item-ok' : 'item-nok'}">${item.conforme ? '✓' : '✗'}</span>
            <div style="flex:1">
              <div style="font-size:0.8rem;">${escHtml(item.label)}</div>
              ${item.remarque ? `<div style="font-size:0.7rem;color:#6B7280;">${escHtml(item.remarque)}</div>` : ''}
            </div>
          </div>
        `).join('');
        sectionsHtml += `
          <div class="inspection-section">
            <h4>${escHtml(sec.label)} <span style="font-weight:400;font-size:0.75rem;color:#6B7280;">(${(sec.items||[]).filter(i=>i.conforme).length}/${(sec.items||[]).length} conforme)</span></h4>
            ${itemsHtml}
          </div>
        `;
      });

      const hasPdf = insp.pdfs && insp.pdfs.length > 0;
      const pdfIcons = hasPdf ? insp.pdfs.map(p => `<a href="${p.data}" download="${p.name}" title="${escHtml(p.name)}" style="display:inline-flex;align-items:center;color:#059669;text-decoration:none;font-size:0.7rem;margin-right:2px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></a>`).join('') : '';

      html += `
        <div style="margin-bottom:16px;padding:12px;background:#F9FAFB;border-radius:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:4px;">
            <strong style="font-size:0.85rem;">${insp.date || '-'} — Inspecteur : ${escHtml(insp.inspecteur || '-')}</strong>
            <div style="display:inline-flex;align-items:center;gap:4px;">
              ${pdfIcons}
              <button class="btn-action pdf" style="min-width:52px;" onclick="uploadSpfPdf('${fiche.id}',${vi})" title="Ajouter PDF">+ PDF</button>
              <button class="btn-action edit" style="min-width:80px;" onclick="editSpfInspection('${fiche.id}',${vi})" title="Modifier">✎ Modifier</button>
              <button class="btn-action delete" style="min-width:70px;" onclick="deleteSpfInspection('${fiche.id}',${vi})" title="Supprimer">✕ Suppr.</button>
            </div>
          </div>
          ${sectionsHtml}
        </div>
      `;
    });
  }

  return `
    <div style="display:flex;align-items:flex-end;margin-bottom:12px;gap:8px;flex-wrap:wrap;">
      <button class="btn-add" onclick="addSpfInspection('${fiche.id}')">+ Nouvelle inspection</button>
      <div style="margin-left:auto;display:flex;gap:6px;">
        <button class="btn-export" onclick="exportBlankSectionPdf('${fiche.id}','spf')">Vierge</button>
        <button class="btn-export" onclick="exportSectionPdf('${fiche.id}','spf')">Export PDF</button>
      </div>
    </div>
    ${html}
  `;
}

function addSpfInspection(ficheId) {
  var fiche = fiches.find(function(f) { return f.id === ficheId; });
  if (!fiche) return;
  getSuiviData(fiche);

  var today = new Date().toISOString().split('T')[0];
  var html =
    '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">' +
      '<div class="a4-field" style="flex:1;min-width:150px;">' +
        '<label>Date de l\'inspection</label>' +
        '<input type="date" id="spf-date" value="' + today + '">' +
      '</div>' +
      '<div class="a4-field" style="flex:2;min-width:200px;">' +
        '<label>Inspecteur</label>' +
        '<input id="spf-inspecteur" placeholder="Nom de l\'inspecteur">' +
      '</div>' +
    '</div>';

  for (var si = 0; si < SPF_SECTIONS.length; si++) {
    var sec = SPF_SECTIONS[si];
    var itemsHtml = '';
    for (var ii = 0; ii < sec.items.length; ii++) {
      itemsHtml +=
        '<div class="a4-check-item">' +
          '<input type="checkbox" id="spf-ok-' + si + '-' + ii + '" checked>' +
          '<div style="flex:1">' +
            '<div class="a4-check-label">' + escHtml(sec.items[ii]) + '</div>' +
            '<input class="a4-check-remarque" id="spf-rem-' + si + '-' + ii + '" placeholder="Remarque...">' +
          '</div>' +
        '</div>';
    }
    html +=
      '<div class="a4-section">' +
        '<div class="a4-section-title">' + escHtml(sec.label) + '</div>' +
        '<div class="a4-section-body">' + itemsHtml + '</div>' +
      '</div>';
  }

  showA4Popup({
    title: 'Nouvelle inspection SPF Bien-être - ' + fiche.societe,
    bodyHtml: html,
    saveLabel: 'Enregistrer l\'inspection',
    onSave: function() {
      var date = document.getElementById('spf-date').value;
      var inspecteur = document.getElementById('spf-inspecteur').value;
      if (!date) { alert('Veuillez entrer une date.'); return false; }
      var sections = [];
      for (var s = 0; s < SPF_SECTIONS.length; s++) {
        var sec = SPF_SECTIONS[s];
        var items = [];
        for (var i = 0; i < sec.items.length; i++) {
          items.push({
            label: sec.items[i],
            conforme: document.getElementById('spf-ok-' + s + '-' + i).checked,
            remarque: document.getElementById('spf-rem-' + s + '-' + i).value
          });
        }
        sections.push({ label: sec.label, items: items });
      }
      fiche.spfBienEtre.inspections.push({ date: date, inspecteur: inspecteur, sections: sections, pdfs: [] });
      fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
      saveFiches();
      showNotification('Inspection ajoutée');
      openSuiviModal(fiche, 'spf');
    }
  });
}

function editSpfInspection(ficheId, index) {
  var fiche = fiches.find(function(f) { return f.id === ficheId; });
  if (!fiche) return;
  var insp = fiche.spfBienEtre.inspections[index];
  if (!insp) return;

  var html =
    '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">' +
      '<div class="a4-field" style="flex:1;min-width:150px;">' +
        '<label>Date de l\'inspection</label>' +
        '<input type="date" id="spf-date" value="' + (insp.date || '') + '">' +
      '</div>' +
      '<div class="a4-field" style="flex:2;min-width:200px;">' +
        '<label>Inspecteur</label>' +
        '<input id="spf-inspecteur" value="' + escHtml(insp.inspecteur || '') + '">' +
      '</div>' +
    '</div>';

  for (var si = 0; si < SPF_SECTIONS.length; si++) {
    var sec = SPF_SECTIONS[si];
    var existingSec = insp.sections && insp.sections[si] ? insp.sections[si] : { items: [] };
    var itemsHtml = '';
    for (var ii = 0; ii < sec.items.length; ii++) {
      var existingItem = existingSec.items && existingSec.items[ii] ? existingSec.items[ii] : { label: sec.items[ii], conforme: false, remarque: '' };
      itemsHtml +=
        '<div class="a4-check-item">' +
          '<input type="checkbox" id="spf-ok-' + si + '-' + ii + '" ' + (existingItem.conforme ? 'checked' : '') + '>' +
          '<div style="flex:1">' +
            '<div class="a4-check-label">' + escHtml(sec.items[ii]) + '</div>' +
            '<input class="a4-check-remarque" id="spf-rem-' + si + '-' + ii + '" value="' + escHtml(existingItem.remarque || '') + '" placeholder="Remarque...">' +
          '</div>' +
        '</div>';
    }
    html +=
      '<div class="a4-section">' +
        '<div class="a4-section-title">' + escHtml(sec.label) + '</div>' +
        '<div class="a4-section-body">' + itemsHtml + '</div>' +
      '</div>';
  }

  showA4Popup({
    title: 'Modifier l\'inspection SPF Bien-être - ' + fiche.societe,
    bodyHtml: html,
    onSave: function() {
      if (!document.getElementById('spf-date').value) { alert('Veuillez entrer une date.'); return false; }
      insp.date = document.getElementById('spf-date').value;
      insp.inspecteur = document.getElementById('spf-inspecteur').value;
      for (var s = 0; s < SPF_SECTIONS.length; s++) {
        if (!insp.sections[s]) insp.sections[s] = { label: SPF_SECTIONS[s].label, items: [] };
        for (var i = 0; i < SPF_SECTIONS[s].items.length; i++) {
          if (!insp.sections[s].items[i]) insp.sections[s].items[i] = { label: SPF_SECTIONS[s].items[i], conforme: false, remarque: '' };
          insp.sections[s].items[i].conforme = document.getElementById('spf-ok-' + s + '-' + i).checked;
          insp.sections[s].items[i].remarque = document.getElementById('spf-rem-' + s + '-' + i).value;
        }
      }
      fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
      saveFiches();
      showNotification('Inspection modifiée');
      openSuiviModal(fiche, 'spf');
    }
  });
}

function deleteSpfInspection(ficheId, index) {
  if (!confirm('Supprimer cette inspection ?')) return;
  const fiche = fiches.find(f => f.id === ficheId);
  if (!fiche) return;
  fiche.spfBienEtre.inspections.splice(index, 1);
  fiche.dateMiseAJour = new Date().toISOString().split('T')[0];
  saveFiches();
  showNotification('Inspection supprimée');
  openSuiviModal(fiche, 'spf');
}

function uploadSpfPdf(ficheId, index) {
  uploadSuiviPdf(ficheId, 'spf', index);
}

// ========== EXPORT PDF ==========

function exportSectionPdf(ficheId, section) {
  const fiche = fiches.find(f => f.id === ficheId);
  if (!fiche) return;
  getSuiviData(fiche);

  let sectionTitle = '';
  let contentHtml = '';

  if (section === 'cppt') {
    sectionTitle = 'CPPT - Réunions';
    const reunions = fiche.cppt.reunions || [];
    if (reunions.length === 0) {
      contentHtml = '<p>Aucune réunion enregistrée.</p>';
    } else {
      contentHtml = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;">';
      contentHtml += '<tr style="background:#0052A5;color:#fff;"><th>Date</th><th>Ordre du jour</th><th>Décisions</th></tr>';
      reunions.forEach(r => {
        contentHtml += `<tr><td>${r.date}</td><td>${escHtml(r.ordreJour)}</td><td>${escHtml(r.decisions)}</td></tr>`;
      });
      contentHtml += '</table>';
    }
  } else if (section === 'qualite') {
    sectionTitle = 'Qualité Bâtiments - Visites communales';
    const visites = fiche.qualiteBatiments.visites || [];
    if (visites.length === 0) {
      contentHtml = '<p>Aucune visite enregistrée.</p>';
    } else {
      visites.forEach(v => {
        contentHtml += `<h3 style="font-size:14px;margin-top:16px;">${v.date} — ${escHtml(v.batiment)}</h3>`;
        contentHtml += '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;">';
        contentHtml += '<tr style="background:#0052A5;color:#fff;"><th>Critère</th><th>Conforme</th><th>Remarque</th></tr>';
        (v.items || []).forEach(item => {
          contentHtml += `<tr><td>${escHtml(item.label)}</td><td>${item.ok ? 'Oui' : 'Non'}</td><td>${escHtml(item.remarque)}</td></tr>`;
        });
        contentHtml += '</table>';
      });
    }
  } else if (section === 'spf') {
    sectionTitle = 'SPF Bien-être - Inspections';
    const inspections = fiche.spfBienEtre.inspections || [];
    if (inspections.length === 0) {
      contentHtml = '<p>Aucune inspection enregistrée.</p>';
    } else {
      inspections.forEach(insp => {
        contentHtml += `<h3 style="font-size:14px;margin-top:16px;">${insp.date} — Inspecteur : ${escHtml(insp.inspecteur)}</h3>`;
        (insp.sections || []).forEach(sec => {
          contentHtml += `<h4 style="font-size:13px;margin-top:12px;">${escHtml(sec.label)} (${(sec.items||[]).filter(i=>i.conforme).length}/${(sec.items||[]).length} conforme)</h4>`;
          contentHtml += '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;">';
          contentHtml += '<tr style="background:#0052A5;color:#fff;"><th>Critère</th><th>Conforme</th><th>Remarque</th></tr>';
          (sec.items || []).forEach(item => {
            contentHtml += `<tr><td>${escHtml(item.label)}</td><td>${item.conforme ? 'Oui' : 'Non'}</td><td>${escHtml(item.remarque)}</td></tr>`;
          });
          contentHtml += '</table>';
        });
      });
    }
  }

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${fiche.societe} - ${sectionTitle}</title>
      <style>
        @page { margin: 20mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 18px; color: #0052A5; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #374151; margin-top: 0; font-weight: 400; }
        .header { border-bottom: 2px solid #0052A5; padding-bottom: 8px; margin-bottom: 16px; }
        .footer { margin-top: 30px; font-size: 10px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 8px; }
        table { margin-bottom: 16px; }
        th { text-align: left; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escHtml(fiche.societe)} — ${sectionTitle}</h1>
        <h2>${escHtml(fiche.titre)}</h2>
      </div>
      ${contentHtml}
      <div class="footer">
        Document généré le ${new Date().toLocaleDateString('fr-BE')} — SLFP
      </div>
      <script>
        window.onload = function() { window.print(); window.close(); }
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function exportBlankSectionPdf(ficheId, section) {
  const fiche = fiches.find(f => f.id === ficheId);
  if (!fiche) return;
  const color = fiche.couleur || '#0052A5';
  const label = typeLabels[fiche.type] || 'Suivi';
  const today = new Date().toLocaleDateString('fr-BE');

  let sectionTitle = '';
  let sectionBody = '';

  if (section === 'cppt') {
    sectionTitle = 'Réunions CPPT';
    let blanks = '';
    for (var ci = 0; ci < 3; ci++) {
      blanks +=
        '<div style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #ccc;padding:10px;border-radius:4px;">' +
          '<div style="font-size:9px;color:#9CA3AF;margin-bottom:6px;text-transform:uppercase;">Réunion CPPT n°' + (ci + 1) + '</div>' +
          '<div class="field"><label>Date de la réunion</label><div class="line"></div></div>' +
          '<div class="field"><label>Ordre du jour</label><div class="bigline"></div></div>' +
          '<div class="field"><label>Décisions prises</label><div class="bigline"></div></div>' +
        '</div>';
    }
    sectionBody = blanks;
  } else if (section === 'qualite') {
    sectionTitle = 'Visites Qualité des Bâtiments';
    let checkRows = '';
    for (var qi = 0; qi < QUALITE_ITEMS.length; qi++) {
      checkRows +=
        '<tr>' +
          '<td style="padding:3px 6px;">' + escHtml(QUALITE_ITEMS[qi]) + '</td>' +
          '<td style="width:50px;text-align:center;padding:3px;"><div style="width:14px;height:14px;border:2px solid #333;margin:0 auto;border-radius:2px;"></div></td>' +
          '<td style="padding:3px 6px;"><div style="border-bottom:1px solid #999;height:18px;"></div></td>' +
        '</tr>';
    }
    let blanks = '';
    for (var vci = 0; vci < 2; vci++) {
      blanks +=
        '<div style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #ccc;padding:10px;border-radius:4px;">' +
          '<div style="font-size:9px;color:#9CA3AF;margin-bottom:6px;text-transform:uppercase;">Visite Qualité n°' + (vci + 1) + '</div>' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
            '<div class="field" style="flex:1;min-width:140px;"><label>Date de la visite</label><div class="line"></div></div>' +
            '<div class="field" style="flex:2;min-width:180px;"><label>Bâtiment visité</label><div class="line"></div></div>' +
          '</div>' +
          '<h4 style="margin:8px 0 4px;">Checklist — cocher si conforme</h4>' +
          '<table><thead><tr><th>Critère</th><th style="width:50px;">Conforme</th><th>Remarque</th></tr></thead><tbody>' + checkRows + '</tbody></table>' +
        '</div>';
    }
    sectionBody = blanks;
  } else if (section === 'spf') {
    sectionTitle = 'Inspections SPF Bien-être';
    let sectionRows = '';
    for (var si = 0; si < SPF_SECTIONS.length; si++) {
      var sec = SPF_SECTIONS[si];
      var secRows = '';
      for (var ii = 0; ii < sec.items.length; ii++) {
        secRows +=
          '<tr>' +
            '<td style="padding:2px 6px;font-size:9px;">' + escHtml(sec.items[ii]) + '</td>' +
            '<td style="width:40px;text-align:center;padding:2px;"><div style="width:12px;height:12px;border:2px solid #333;margin:0 auto;border-radius:2px;"></div></td>' +
            '<td style="padding:2px 6px;"><div style="border-bottom:1px solid #999;height:16px;"></div></td>' +
          '</tr>';
      }
      sectionRows +=
        '<tr><td colspan="3" style="background:#E5E7EB;font-weight:700;padding:4px 6px;font-size:10px;">' + escHtml(sec.label) + '</td></tr>' +
        secRows;
    }
    let blanks = '';
    for (var isi = 0; isi < 2; isi++) {
      blanks +=
        '<div style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #ccc;padding:10px;border-radius:4px;">' +
          '<div style="font-size:9px;color:#9CA3AF;margin-bottom:6px;text-transform:uppercase;">Inspection SPF n°' + (isi + 1) + '</div>' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
            '<div class="field" style="flex:1;min-width:140px;"><label>Date de l\'inspection</label><div class="line"></div></div>' +
            '<div class="field" style="flex:2;min-width:180px;"><label>Inspecteur</label><div class="line"></div></div>' +
          '</div>' +
          '<table><thead><tr><th>Critère</th><th style="width:40px;">Conforme</th><th>Remarque</th></tr></thead><tbody>' + sectionRows + '</tbody></table>' +
        '</div>';
    }
    sectionBody = blanks;
  }

  const w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Formulaire vierge - ' + escHtml(fiche.titre) + ' - ' + sectionTitle + '</title><style>\
    @page { margin: 15mm; size: A4 portrait; }\
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; line-height: 1.4; }\
    h1 { font-size: 20px; color: ' + color + '; margin: 0 0 2px; }\
    h2 { font-size: 15px; color: #555; font-weight: 400; margin: 0 0 4px; }\
    h3 { font-size: 15px; color: ' + color + '; margin: 24px 0 6px; border-bottom: 2px solid ' + color + '; padding-bottom: 3px; }\
    h4 { font-size: 13px; margin: 12px 0 4px; color: #374151; }\
    table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; }\
    th { border: 1px solid #333; padding: 5px 8px; text-align: left; font-size: 11px; background: #E5E7EB; font-weight: 700; }\
    td { border: 1px solid #333; padding: 4px 8px; font-size: 11px; }\
    .field { margin: 6px 0; }\
    .field label { display: block; font-weight: 700; font-size: 12px; color: #374151; margin-bottom: 2px; }\
    .field .line { border-bottom: 1px solid #333; height: 26px; margin-bottom: 6px; }\
    .field .bigline { border: 1px solid #333; height: 80px; margin-bottom: 8px; padding: 6px; }\
    .header { border-bottom: 3px solid ' + color + '; padding-bottom: 8px; margin-bottom: 14px; }\
    .badge { display: inline-block; background: ' + color + '; color: #fff; padding: 4px 12px; border-radius: 3px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; }\
    .footer { margin-top: 24px; font-size: 10px; color: #9CA3AF; border-top: 1px solid #ccc; padding-top: 6px; text-align: center; }\
    label { font-weight: 700; font-size: 12px; color: #374151; }\
    @media print { .no-print { display: none; } }\
  </style></head><body>\
    <div class="header">\
      <div class="badge">' + escHtml(label) + '</div>\
      <h1>' + escHtml(fiche.titre) + '</h1>\
      <h2>' + escHtml(fiche.societe || '') + '</h2>\
    </div>\
    <h3>' + sectionTitle + '</h3>\
    ' + sectionBody + '\
    <div class="footer">Formulaire vierge généré le ' + today + ' — SLFP</div>\
    <script>window.onload = function(){ window.print(); };<' + '/script>\
  </body></html>');
  w.document.close();
}

function exportBlankSuiviPdf(ficheId) {
  const fiche = fiches.find(f => f.id === ficheId);
  if (!fiche) return;
  const color = fiche.couleur || '#0052A5';
  const label = typeLabels[fiche.type] || 'Suivi';
  const today = new Date().toLocaleDateString('fr-BE');

  // Build CPPT blanks (3 entries)
  let cpptBlanks = '';
  for (var ci = 0; ci < 3; ci++) {
    cpptBlanks +=
      '<div style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #ccc;padding:10px;border-radius:4px;">' +
        '<div style="font-size:9px;color:#9CA3AF;margin-bottom:6px;text-transform:uppercase;">Réunion CPPT n°' + (ci + 1) + '</div>' +
        '<div class="field"><label>Date de la réunion</label><div class="line"></div></div>' +
        '<div class="field"><label>Ordre du jour</label><div class="bigline"></div></div>' +
        '<div class="field"><label>Décisions prises</label><div class="bigline"></div></div>' +
      '</div>';
  }

  // Build Qualité blanks (2 entries)
  let qualiteCheckRows = '';
  for (var qi = 0; qi < QUALITE_ITEMS.length; qi++) {
    qualiteCheckRows +=
      '<tr>' +
        '<td style="padding:3px 6px;">' + escHtml(QUALITE_ITEMS[qi]) + '</td>' +
        '<td style="width:50px;text-align:center;padding:3px;"><div style="width:14px;height:14px;border:2px solid #333;margin:0 auto;border-radius:2px;"></div></td>' +
        '<td style="padding:3px 6px;"><div style="border-bottom:1px solid #999;height:18px;"></div></td>' +
      '</tr>';
  }
  let qualiteBlanks = '';
  for (var vci = 0; vci < 2; vci++) {
    qualiteBlanks +=
      '<div style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #ccc;padding:10px;border-radius:4px;">' +
        '<div style="font-size:9px;color:#9CA3AF;margin-bottom:6px;text-transform:uppercase;">Visite Qualité n°' + (vci + 1) + '</div>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
          '<div class="field" style="flex:1;min-width:140px;"><label>Date de la visite</label><div class="line"></div></div>' +
          '<div class="field" style="flex:2;min-width:180px;"><label>Bâtiment visité</label><div class="line"></div></div>' +
        '</div>' +
        '<h4 style="margin:8px 0 4px;">Checklist — cocher si conforme</h4>' +
        '<table><thead><tr><th>Critère</th><th style="width:50px;">Conforme</th><th>Remarque</th></tr></thead><tbody>' + qualiteCheckRows + '</tbody></table>' +
      '</div>';
  }

  // Build SPF blanks (2 entries)
  let spfSectionRows = '';
  for (var si = 0; si < SPF_SECTIONS.length; si++) {
    var sec = SPF_SECTIONS[si];
    var secRows = '';
    for (var ii = 0; ii < sec.items.length; ii++) {
      secRows +=
        '<tr>' +
          '<td style="padding:2px 6px;font-size:9px;">' + escHtml(sec.items[ii]) + '</td>' +
          '<td style="width:40px;text-align:center;padding:2px;"><div style="width:12px;height:12px;border:2px solid #333;margin:0 auto;border-radius:2px;"></div></td>' +
          '<td style="padding:2px 6px;"><div style="border-bottom:1px solid #999;height:16px;"></div></td>' +
        '</tr>';
    }
    spfSectionRows +=
      '<tr><td colspan="3" style="background:#E5E7EB;font-weight:700;padding:4px 6px;font-size:10px;">' + escHtml(sec.label) + '</td></tr>' +
      secRows;
  }
  let spfBlanks = '';
  for (var isi = 0; isi < 2; isi++) {
    spfBlanks +=
      '<div style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #ccc;padding:10px;border-radius:4px;">' +
        '<div style="font-size:9px;color:#9CA3AF;margin-bottom:6px;text-transform:uppercase;">Inspection SPF n°' + (isi + 1) + '</div>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
          '<div class="field" style="flex:1;min-width:140px;"><label>Date de l\'inspection</label><div class="line"></div></div>' +
          '<div class="field" style="flex:2;min-width:180px;"><label>Inspecteur</label><div class="line"></div></div>' +
        '</div>' +
        '<table><thead><tr><th>Critère</th><th style="width:40px;">Conforme</th><th>Remarque</th></tr></thead><tbody>' + spfSectionRows + '</tbody></table>' +
      '</div>';
  }

  const w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Formulaire vierge - ' + escHtml(fiche.titre) + '</title><style>\
    @page { margin: 15mm; size: A4 portrait; }\
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; line-height: 1.4; }\
    h1 { font-size: 20px; color: ' + color + '; margin: 0 0 2px; }\
    h2 { font-size: 15px; color: #555; font-weight: 400; margin: 0 0 4px; }\
    h3 { font-size: 15px; color: ' + color + '; margin: 24px 0 6px; border-bottom: 2px solid ' + color + '; padding-bottom: 3px; }\
    h4 { font-size: 13px; margin: 12px 0 4px; color: #374151; }\
    table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; }\
    th { border: 1px solid #333; padding: 5px 8px; text-align: left; font-size: 11px; background: #E5E7EB; font-weight: 700; }\
    td { border: 1px solid #333; padding: 4px 8px; font-size: 11px; }\
    .field { margin: 6px 0; }\
    .field label { display: block; font-weight: 700; font-size: 12px; color: #374151; margin-bottom: 2px; }\
    .field .line { border-bottom: 1px solid #333; height: 26px; margin-bottom: 6px; }\
    .field .bigline { border: 1px solid #333; height: 80px; margin-bottom: 8px; padding: 6px; }\
    .header { border-bottom: 3px solid ' + color + '; padding-bottom: 8px; margin-bottom: 14px; }\
    .badge { display: inline-block; background: ' + color + '; color: #fff; padding: 4px 12px; border-radius: 3px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; }\
    .footer { margin-top: 24px; font-size: 10px; color: #9CA3AF; border-top: 1px solid #ccc; padding-top: 6px; text-align: center; }\
    label { font-weight: 700; font-size: 12px; color: #374151; }\
    @media print { .no-print { display: none; } }\
  </style></head><body>\
    <div class="header">\
      <div class="badge">' + escHtml(label) + '</div>\
      <h1>' + escHtml(fiche.titre) + '</h1>\
      <h2>' + escHtml(fiche.societe || '') + '</h2>\
    </div>\
    <h3>Réunions CPPT</h3>\
    ' + cpptBlanks + '\
    <h3>Visites Qualité des Bâtiments</h3>\
    ' + qualiteBlanks + '\
    <h3>Inspections SPF Bien-être</h3>\
    ' + spfBlanks + '\
    <div class="footer">Formulaire vierge généré le ' + today + ' — SLFP</div>\
    <script>window.onload = function(){ window.print(); };<' + '/script>\
  </body></html>');
  w.document.close();
}

function previewPDF(id) {
  const fiche = fiches.find(f => f.id === id);
  if (!fiche || !fiche.fichierPdf) return;
  
  const src = fiche.fichierPdf.startsWith('http') ? fiche.fichierPdf : dataUrlToBlobUrl(fiche.fichierPdf);
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) { showNotification('Autorisez les popups pour voir l\'aperçu'); return; }
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${fiche.pdfNom || 'Document PDF'} - ${fiche.titre}</title>
      <style>
        body { margin: 0; padding: 0; }
        embed { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <embed src="${src}" type="application/pdf">
    </body>
    </html>
  `);
}

function dataUrlToBlobUrl(dataUrl) {
  try {
    var parts = dataUrl.split(',');
    var mime = parts[0].match(/:(.*?);/)[1];
    var raw = atob(parts[1]);
    var rawLen = raw.length;
    var u8arr = new Uint8Array(rawLen);
    for (var i = 0; i < rawLen; i++) u8arr[i] = raw.charCodeAt(i);
    return URL.createObjectURL(new Blob([u8arr], { type: mime }));
  } catch(e) {
    return dataUrl;
  }
}

function previewPdfData(id, index) {
  const fiche = fiches.find(f => f.id === id);
  if (!fiche || !fiche.pdfs || !fiche.pdfs[index]) return;
  
  const pdf = fiche.pdfs[index];
  const src = pdf.data.startsWith('http') ? pdf.data : dataUrlToBlobUrl(pdf.data);
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) { showNotification('Autorisez les popups pour voir l\'aperçu'); return; }

  previewWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${pdf.name}</title>
      <style>
        body { margin: 0; padding: 0; }
        embed { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <embed src="${src}" type="application/pdf">
    </body>
    </html>
  `);
}

function previewSuiviPdf(ficheId, section, index, pdfIndex) {
  const fiche = fiches.find(f => f.id === ficheId);
  if (!fiche) return;
  getSuiviData(fiche);
  var parent;
  if (section === 'cppt') parent = fiche.cppt.reunions[index];
  else if (section === 'qualite') parent = fiche.qualiteBatiments.visites[index];
  else if (section === 'spf') parent = fiche.spfBienEtre.inspections[index];
  if (!parent || !parent.pdfs || !parent.pdfs[pdfIndex]) return;
  const pdf = parent.pdfs[pdfIndex];
  const src = pdf.data.startsWith('http') ? pdf.data : dataUrlToBlobUrl(pdf.data);
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) { showNotification('Autorisez les popups pour voir l\'aperçu'); return; }
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${pdf.name}</title>
      <style>
        body { margin: 0; padding: 0; }
        embed { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <embed src="${src}" type="application/pdf">
    </body>
    </html>
  `);
}

function openGoogleDrivePopup(link) {
  // Convert Google Drive link to preview format
  let previewLink = link;
  
  // Extract file ID from various Google Drive link formats
  let fileId = '';
  
  // Format: https://drive.google.com/file/d/FILE_ID/...
  const match1 = link.match(/\/file\/d\/([^/]+)/);
  if (match1) {
    fileId = match1[1];
    previewLink = `https://drive.google.com/file/d/${fileId}/preview`;
  }
  
  // Format: https://drive.google.com/open?id=FILE_ID
  const match2 = link.match(/[?&]id=([^&]+)/);
  if (match2 && !fileId) {
    fileId = match2[1];
    previewLink = `https://drive.google.com/file/d/${fileId}/preview`;
  }
  
  // Open PDF viewer modal
  document.getElementById('pdfViewerIframe').src = previewLink;
  document.getElementById('pdfViewerTitle').textContent = 'Document Google Drive';
  document.getElementById('pdfViewerOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePdfViewer() {
  document.getElementById('pdfViewerIframe').src = '';
  document.getElementById('pdfViewerOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// Image preview handler
function setupImagePreview() {
  const imageFileInput = document.getElementById('ficheImageFile');
  const imageUrlInput = document.getElementById('ficheImage');
  const imagePreviewImg = document.getElementById('imagePreviewImg');
  const imagePlaceholder = document.getElementById('imagePlaceholder');
  
  if (imageFileInput) {
    imageFileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // Compress and resize the image
        const reader = new FileReader();
        reader.onload = function(event) {
          const img = new Image();
          img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxSize = 200;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressed = canvas.toDataURL('image/jpeg', 0.5);
            window.imageFileData = compressed;
            
            imagePreviewImg.src = compressed;
            imagePreviewImg.style.display = 'block';
            imagePlaceholder.style.display = 'none';
            imageUrlInput.value = '';
            
            showNotification('Image compressée et prête');
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', function(e) {
      const url = e.target.value.trim();
      if (url) {
        imagePreviewImg.src = url;
        imagePreviewImg.style.display = 'block';
        imagePlaceholder.style.display = 'none';
        window.imageFileData = null;
        imageFileInput.value = '';
      } else {
        imagePreviewImg.style.display = 'none';
        imagePlaceholder.style.display = 'block';
        window.imageFileData = null;
      }
    });
  }
}

function setupLogoPreview() {
  const logoFileInput = document.getElementById('ficheLogoFile');
  if (logoFileInput) {
    logoFileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const img = new Image();
          img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxSize = 100;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
            } else {
              if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
            }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            window.logoFileData = canvas.toDataURL('image/png');
            document.getElementById('ficheLogo').value = '';
            showNotification('Logo prêt');
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// ========== UPDATE CLOUD FUNCTIONS ==========

const NETLIFY_SITE_ID = 'mellow-jelly-ba7bd6';

function setupUpdateCloud() {
  const updateBtn = document.getElementById('updateCloudBtn');
  const updateModal = document.getElementById('updateModalOverlay');
  const updateModalClose = document.getElementById('updateModalClose');
  const updateAutoBtn = document.getElementById('updateAutoBtn');
  const folderInput = document.getElementById('updateFolderInput');
  const updateOkBtn = document.getElementById('updateOkBtn');

  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      updateModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  if (updateModalClose) {
    updateModalClose.addEventListener('click', () => {
      updateModal.classList.remove('active');
      document.body.style.overflow = '';
      resetUpdateModal();
    });
  }

  if (updateAutoBtn) {
    updateAutoBtn.addEventListener('click', () => {
      folderInput.click();
    });
  }

  if (folderInput) {
    folderInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        deployToNetlify(files);
      }
    });
  }

  if (updateOkBtn) {
    updateOkBtn.addEventListener('click', () => {
      updateModal.classList.remove('active');
      document.body.style.overflow = '';
      resetUpdateModal();
    });
  }
}

function resetUpdateModal() {
  document.getElementById('updateProgressSimple').style.display = 'none';
  document.getElementById('updateResultSimple').style.display = 'none';
  document.getElementById('updateAutoBtn').style.display = 'flex';
  document.getElementById('updateFolderInput').value = '';
}

async function deployToNetlify(files) {
  const progress = document.getElementById('updateProgressSimple');
  const status = document.getElementById('updateStatusSimple');
  const autoBtn = document.getElementById('updateAutoBtn');
  const result = document.getElementById('updateResultSimple');
  const urlDisplay = document.getElementById('updateUrlDisplay');

  autoBtn.style.display = 'none';
  progress.style.display = 'block';
  status.textContent = 'Préparation des fichiers...';

  try {
    // Create a zip file from the files
    const zipBlob = await createZipFromFiles(files);
    
    status.textContent = 'Envoi vers Netlify...';

    // Deploy using Netlify API with zip file
    const response = await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/zip'
      },
      body: zipBlob
    });

    status.textContent = 'Finalisation du déploiement...';

    if (response.ok) {
      const deploy = await response.json();
      
      setTimeout(() => {
        progress.style.display = 'none';
        result.style.display = 'block';
        urlDisplay.textContent = `https://${NETLIFY_SITE_ID}.netlify.app`;
      }, 1000);
    } else {
      const error = await response.text();
      console.error('Erreur Netlify:', error);
      status.textContent = 'Erreur de déploiement.';
    }
  } catch (error) {
    console.error('Erreur:', error);
    status.textContent = 'Erreur lors de l\'envoi.';
  }
}

async function createZipFromFiles(files) {
  // Use JSZip if available, otherwise create a simple approach
  if (typeof JSZip !== 'undefined') {
    const zip = new JSZip();
    for (const file of files) {
      const path = file.webkitRelativePath || file.name;
      zip.file(path, file);
    }
    return await zip.generateAsync({ type: 'blob' });
  }
  
  // Fallback: create FormData for direct upload
  const formData = new FormData();
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    formData.append('file', file, path);
  }
  return formData;
}

async function createZip(files) {
  // Simple file list for Netlify Drop
  const formData = new FormData();
  
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    formData.append('file', file, path);
  }
  
  return formData;
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function openAdmin() {
  renderAdminList();
  document.getElementById('adminPanel').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function openCompanyFiche(id) {
  document.querySelectorAll('.roi-btn').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.querySelector('.roi-btn[data-id="' + id + '"]');
  if (btn) btn.classList.add('active');
  var fiche = fiches.find(function(f) { return f.id === id; });
  if (fiche) {
    openModal(fiche.id);
  } else {
    // Fallback: try finding by societe (legacy hardcoded buttons)
    var legacyBtn = document.querySelector('.roi-btn[data-company="' + id + '"]');
    if (legacyBtn) legacyBtn.classList.add('active');
    fiche = fiches.find(function(f) { return f.societe === id; });
    if (fiche) openModal(fiche.id);
  }
}

function goHome() {
  document.getElementById('adminPanel').classList.remove('active');
  document.body.style.overflow = '';
  currentFilter = 'all';
  document.getElementById('filterSelect').value = 'all';
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('.roi-btn').forEach(b => b.classList.remove('active'));
  filteredFiches = getHomeFiches();
  currentPage = 0;
  renderCards();
  updatePagination();
  window.scrollTo({ left: 0, behavior: 'smooth' });
}

function closeAdmin() {
  document.getElementById('adminPanel').classList.remove('active');
  document.body.style.overflow = '';
}

function renderAccessRequests() {
  const container = document.getElementById('accessRequests');
  const list = document.getElementById('requestsList');
  const requests = JSON.parse(localStorage.getItem('slfp_pin_requests') || '[]');
  const activePins = JSON.parse(localStorage.getItem('slfp_pins') || '[]');

  if (requests.length === 0 && activePins.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  let html = '';
  if (requests.length > 0) {
    html += '<div class="requests-section"><h4 class="admin-section-title">En attente</h4>';
    requests.forEach((req, i) => {
      const date = new Date(req.date);
      html += `
        <div class="request-item">
          <div class="request-item-info">
            <div class="request-item-name">${escHtml(req.name)}</div>
            <div class="request-item-email">${escHtml(req.email)}</div>
            <div class="request-item-date">${date.toLocaleDateString()}</div>
          </div>
          <div class="request-actions">
            <button class="request-accept-btn" onclick="acceptRequest(${i})">Accepter</button>
            <button class="request-reject-btn" onclick="rejectRequest(${i})">Refuser</button>
          </div>
        </div>`;
    });
    html += '</div>';
  }

  if (activePins.length > 0) {
    html += '<div class="requests-section"><h4 class="admin-section-title">Codes actifs</h4>';
    activePins.forEach((pin, i) => {
      html += `
        <div class="request-item">
          <div class="request-item-info">
            <div class="request-item-name">${escHtml(pin.name)}</div>
            <div class="request-item-email">${escHtml(pin.email || '')}</div>
            <div class="request-item-date">Code: ${pin.code}</div>
          </div>
          <div class="request-actions">
            <button class="request-reject-btn" onclick="revokePin(${i})">Révoquer</button>
          </div>
        </div>`;
    });
    html += '</div>';
  }

  list.innerHTML = html;
}

function acceptRequest(index) {
  const requests = JSON.parse(localStorage.getItem('slfp_pin_requests') || '[]');
  if (index < 0 || index >= requests.length) return;
  const req = requests[index];
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const pins = JSON.parse(localStorage.getItem('slfp_pins') || '[]');
  pins.push({ name: req.name, email: req.email, code, date: new Date().toISOString() });
  localStorage.setItem('slfp_pins', JSON.stringify(pins));
  requests.splice(index, 1);
  localStorage.setItem('slfp_pin_requests', JSON.stringify(requests));
  renderAccessRequests();
  showNotification(`Code ${code} attribué à ${req.name}`);
}

function rejectRequest(index) {
  const requests = JSON.parse(localStorage.getItem('slfp_pin_requests') || '[]');
  if (index < 0 || index >= requests.length) return;
  requests.splice(index, 1);
  localStorage.setItem('slfp_pin_requests', JSON.stringify(requests));
  renderAccessRequests();
  showNotification('Demande refusée');
}

function revokePin(index) {
  const pins = JSON.parse(localStorage.getItem('slfp_pins') || '[]');
  if (index < 0 || index >= pins.length) return;
  const name = pins[index].name;
  pins.splice(index, 1);
  localStorage.setItem('slfp_pins', JSON.stringify(pins));
  renderAccessRequests();
  showNotification(`Code de ${name} révoqué`);
}

function renderAdminList() {
  renderAccessRequests();
  const list = document.getElementById('ficheList');

  const grouped = {};
  fiches.forEach(fiche => {
    if (!grouped[fiche.type]) grouped[fiche.type] = [];
    grouped[fiche.type].push(fiche);
  });

  const typeOrder = ['reglement', 'reforme', 'loi', 'plans-divers', 'suivi'];

  list.innerHTML = typeOrder.map(type => {
    const items = grouped[type] || [];
    const color = colors[type] || '#0052A5';
    const label = typeLabels[type] || type;

    return `
      <div class="admin-group">
        <div class="admin-group-header" style="background: ${color}">
          <span>${label}</span>
          <span class="admin-group-count">${items.length}</span>
        </div>
        <div class="admin-group-list">
          ${items.map(fiche => `
            <div class="admin-fiche-item" data-id="${fiche.id}" style="border-left-color: ${fiche.couleur || color}">
              <div class="admin-fiche-info" onclick="editFiche('${fiche.id}')">
                <div class="admin-fiche-title"><span class="admin-fiche-priority">${fiche.priority != null ? fiche.priority : '—'}</span> ${fiche.titre}</div>
                <div class="admin-fiche-societe">${fiche.societe}</div>
              </div>
              <div class="admin-fiche-actions">
                <button class="admin-action-btn delete" onclick="deleteFiche('${fiche.id}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function openAddModal() {
  document.getElementById('adminModalTitle').textContent = 'Nouvelle fiche';
  document.getElementById('ficheId').value = '';
  document.getElementById('ficheTitre').value = '';
  document.getElementById('ficheSociete').value = '';
  document.getElementById('ficheType').value = 'reglement';
  document.getElementById('ficheImage').value = '';
  document.getElementById('ficheLogo').value = '';
  setEditorContent('');
  document.getElementById('ficheVilles').value = '';
  setResumeContent('');
  setPdfEntries([]);
  setLiensEntries([]);
  setExternalDocsEntries([]);
  window.googleDriveFileData = null;
  window.imageFileData = null;
  const imagePreviewImg = document.getElementById('imagePreviewImg');
  const imagePlaceholder = document.getElementById('imagePlaceholder');
  if (imagePreviewImg) imagePreviewImg.style.display = 'none';
  if (imagePlaceholder) imagePlaceholder.style.display = 'block';
  document.getElementById('adminModalOverlay').classList.add('active');
}

function editFiche(id) {
  console.log('editFiche called with id=', id);
  var fiche = fiches.find(function(f) { return f.id === id; });
  if (!fiche) { console.warn('editFiche: fiche not found for id=', id); return; }

  document.getElementById('adminModalTitle').textContent = 'Modifier la fiche';
  document.getElementById('ficheId').value = fiche.id;
  console.log('editFiche: set ficheId.value=', fiche.id, 'titre=', fiche.titre);
  document.getElementById('ficheTitre').value = fiche.titre;
  document.getElementById('ficheSociete').value = fiche.societe;
  document.getElementById('ficheType').value = fiche.type;
  document.getElementById('ficheImage').value = '';
  setEditorContent(fiche.contenu);
  document.getElementById('ficheLogo').value = fiche.logo || '';
  document.getElementById('ficheVilles').value = fiche.villesConcernees ? fiche.villesConcernees.join(', ') : '';
  document.getElementById('fichePriority').value = fiche.priority != null ? fiche.priority : 999;
  setResumeContent(fiche.resume || '');
  
  // Show existing image preview
  const imagePreviewImg = document.getElementById('imagePreviewImg');
  const imagePlaceholder = document.getElementById('imagePlaceholder');
  if (fiche.image && imagePreviewImg) {
    imagePreviewImg.src = fiche.image;
    imagePreviewImg.style.display = 'block';
    if (imagePlaceholder) imagePlaceholder.style.display = 'none';
  } else {
    if (imagePreviewImg) imagePreviewImg.style.display = 'none';
    if (imagePlaceholder) imagePlaceholder.style.display = 'block';
  }
  window.imageFileData = null;
  
  // Load existing PDFs
  setPdfEntries(fiche.pdfs || []);
  // Load existing liens
  setLiensEntries(fiche.liens || []);
  // Load existing external docs
  setExternalDocsEntries(fiche.externalDocs || []);

  document.getElementById('adminModalOverlay').classList.add('active');
}

function deleteFiche(id) {
  if (!confirm('Supprimer cette fiche ?')) return;
  
  if (useFirebase) {
    deleteFicheFromFirebase(id).then(success => {
      if (success) {
        fiches = fiches.filter(f => f.id !== id);
        filteredFiches = filteredFiches.filter(f => f.id !== id);
        renderCards();
        renderAdminList();
        updatePagination();
        showNotification('Fiche supprimée');
      }
    });
  } else {
    fiches = fiches.filter(f => f.id !== id);
    saveFiches();
    filteredFiches = filteredFiches.filter(f => f.id !== id);
    renderCards();
    renderAdminList();
    updatePagination();
  }
}

function closeAdminModal() {
  document.getElementById('adminModalOverlay').classList.remove('active');
  window.logoFileData = null;
}

function handleFormSubmit(e) {
  if (e) e.preventDefault();

  var id = document.getElementById('ficheId').value;
  var type = document.getElementById('ficheType').value;
  var villesStr = document.getElementById('ficheVilles').value;
  var imageFileData = window.imageFileData;

  // DEBUG: log what we're about to save
  console.log('handleFormSubmit id=', id, 'titre=', document.getElementById('ficheTitre').value, 'societe=', document.getElementById('ficheSociete').value);
  console.log('fiches array before save:', JSON.parse(JSON.stringify(fiches.map(function(f) { return { id: f.id, titre: f.titre, societe: f.societe }; }))));

  let imageValue = document.getElementById('ficheImage').value;
  if (imageFileData) {
    imageValue = imageFileData;
  } else if (!imageValue && id) {
    const existing = fiches.find(f => f.id === id);
    if (existing && existing.image) {
      imageValue = existing.image;
    }
  }

  let logoValue = document.getElementById('ficheLogo').value;
  if (window.logoFileData) {
    logoValue = window.logoFileData;
    window.logoFileData = null;
  } else if (!logoValue && id) {
    const existing = fiches.find(f => f.id === id);
    if (existing && existing.logo) {
      logoValue = existing.logo;
    }
  }

  var existing = id ? fiches.find(function(f) { return f.id === id; }) : null;

  var ficheData = {
    id: id || Date.now().toString(),
    titre: document.getElementById('ficheTitre').value,
    societe: document.getElementById('ficheSociete').value,
    type: type,
    couleur: colors[type] || '#0052A5',
    image: imageValue || `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400"><rect fill="${encodeURIComponent(colors[type] || '#0052A5')}" width="800" height="400"/><text x="400" y="200" text-anchor="middle" dy=".3em" fill="white" font-size="48" font-family="sans-serif">SLFP</text></svg>`,
    contenu: getEditorContent(),
    logo: logoValue || '',
    villesConcernees: villesStr ? villesStr.split(',').map(function(v) { return v.trim(); }).filter(function(v) { return v; }) : [],
    priority: parseInt(document.getElementById('fichePriority').value, 10) || 0,
    resume: getResumeContent(),
    pdfs: pdfEntries.length > 0 ? pdfEntries.map(function(p) { return { name: p.name, company: p.company, data: p.data }; }) : [],
    fichierPdf: null,
    pdfNom: null,
    externalDocs: externalDocsEntries.length > 0 ? externalDocsEntries.map(function(e) { return { nom: e.nom || '', url: e.url || '' }; }) : [],
    dateCreation: id && existing ? (existing.dateCreation || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
    dateMiseAJour: new Date().toISOString().split('T')[0],
    cppt: existing && existing.cppt ? existing.cppt : (type === 'suivi' ? { reunions: [] } : undefined),
    qualiteBatiments: existing && existing.qualiteBatiments ? existing.qualiteBatiments : (type === 'suivi' ? { visites: [] } : undefined),
    spfBienEtre: existing && existing.spfBienEtre ? existing.spfBienEtre : (type === 'suivi' ? { inspections: [] } : undefined),
    liens: liensEntries.length > 0 ? liensEntries.map(function(l) { return { nom: l.nom || '', url: l.url || '' }; }) : []
  };

  saveAndClose(ficheData, id);
}

async function saveAndClose(ficheData, id) {
  console.log('saveAndClose called id=', id, 'ficheData.titre=', ficheData.titre, 'ficheData.societe=', ficheData.societe);
  
  // Always save to localStorage first (local backup)
  if (id) {
    var index = fiches.findIndex(function(f) { return f.id === id; });
    console.log('saveAndClose: index found=', index);
    if (index !== -1) {
      fiches[index] = ficheData;
    } else {
      console.warn('saveAndClose: fiche with id=' + id + ' not found, pushing as new');
      fiches.push(ficheData);
    }
  } else {
    console.warn('saveAndClose: no id provided, pushing as new');
    fiches.push(ficheData);
  }
  saveFiches();

  // Try Firebase (best-effort, don't block)
  if (useFirebase) {
    var fbSuccess = await saveFicheToFirebase(ficheData);
    if (!fbSuccess) {
      console.warn('saveAndClose: Firebase save failed, localStorage backup is intact');
    }
  }
  
  console.log('fiches after save:', JSON.parse(JSON.stringify(fiches.map(function(f) { return { id: f.id, titre: f.titre, societe: f.societe }; }))));
  
  filteredFiches = currentFilter === 'all'
    ? getHomeFiches()
    : fiches.filter(function(f) { return f.type === currentFilter; });
  renderCards();
  renderAdminList();
  updatePagination();
  updateRoiLogos();
  closeAdminModal();
  showNotification(id ? 'Fiche modifiée' : 'Fiche créée');
}

/* ========== DARK MODE ========== */
(function initTheme() {
  var saved = localStorage.getItem('slfp_theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre');
    btn.addEventListener('click', function() {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('slfp_theme', next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('aria-label', next === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre');
    });
  }
})();



/* ========== SORTABLE COLUMNS ========== */
document.addEventListener('click', function(e) {
  var th = e.target.closest('th.sortable');
  if (!th) return;
  var table = th.closest('table');
  if (!table) return;
  var tbody = table.querySelector('tbody');
  if (!tbody) return;
  var colIndex = Array.prototype.indexOf.call(th.parentNode.children, th);
  var isAsc = th.classList.contains('sorted-asc');
  table.querySelectorAll('th.sortable').forEach(function(h) {
    h.classList.remove('sorted-asc', 'sorted-desc');
    h.setAttribute('aria-sort', 'none');
  });
  th.classList.add(isAsc ? 'sorted-desc' : 'sorted-asc');
  th.setAttribute('aria-sort', isAsc ? 'descending' : 'ascending');
  var rows = Array.from(tbody.querySelectorAll('tr'));
  rows.sort(function(a, b) {
    var aCell = a.children[colIndex];
    var bCell = b.children[colIndex];
    if (!aCell || !bCell) return 0;
    var aText = aCell.textContent.trim().toLowerCase();
    var bText = bCell.textContent.trim().toLowerCase();
    var aNum = parseFloat(aText.replace(/[^0-9,.]/g, '').replace(',', '.'));
    var bNum = parseFloat(bText.replace(/[^0-9,.]/g, '').replace(',', '.'));
    if (!isNaN(aNum) && !isNaN(bNum)) return isAsc ? bNum - aNum : aNum - bNum;
    return isAsc ? bText.localeCompare(aText) : aText.localeCompare(bText);
  });
  rows.forEach(function(row) { tbody.appendChild(row); });
});

/* ========== ACCESSIBILITY — keyboard nav cards ========== */
document.addEventListener('keydown', function(e) {
  var card = e.target.closest('.fiche-card');
  if (!card) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    card.click();
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    var next = card.nextElementSibling;
    if (next && next.classList.contains('fiche-card')) { next.focus(); next.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    var prev = card.previousElementSibling;
    if (prev && prev.classList.contains('fiche-card')) { prev.focus(); prev.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
  }
});
