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
let isPrivate = false;

function initPinModal() {
  if (sessionStorage.getItem('slfp_auth')) {
    isPrivate = true;
    onPrivateMode();
  }

  const overlay = document.getElementById('pinOverlay');
  const digits = document.querySelectorAll('.pin-digit');
  const errorEl = document.getElementById('pinError');

  document.getElementById('privateBtn').addEventListener('click', () => {
    if (isPrivate) {
      isPrivate = false;
      sessionStorage.removeItem('slfp_auth');
      onPublicMode();
    } else {
      overlay.classList.add('active');
      setTimeout(() => digits[0].focus(), 100);
    }
  });

  document.getElementById('pinCancel').addEventListener('click', () => {
    overlay.classList.remove('active');
    digits.forEach(d => d.value = '');
    errorEl.textContent = '';
  });

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

  document.getElementById('pinSubmit').addEventListener('click', checkPin);

  // PIN change
  const changeSection = document.getElementById('pinChangeSection');
  const newDigits = document.querySelectorAll('.new-pin-digit');

  document.getElementById('pinChangeBtn').addEventListener('click', () => {
    changeSection.style.display = 'block';
    document.getElementById('pinSubmit').style.display = 'none';
    document.getElementById('pinCancel').style.display = 'none';
    document.getElementById('pinChangeBtn').style.display = 'none';
    errorEl.textContent = '';
    setTimeout(() => newDigits[0].focus(), 100);
  });

  document.getElementById('pinCancelChange').addEventListener('click', () => {
    changeSection.style.display = 'none';
    document.getElementById('pinSubmit').style.display = '';
    document.getElementById('pinCancel').style.display = '';
    document.getElementById('pinChangeBtn').style.display = '';
    newDigits.forEach(d => d.value = '');
    errorEl.textContent = '';
  });

  newDigits.forEach((input, i) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val;
      if (val && i < newDigits.length - 1) newDigits[i + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) newDigits[i - 1].focus();
      if (e.key === 'Enter') saveNewPin();
    });
  });

  document.getElementById('pinSaveBtn').addEventListener('click', saveNewPin);

  function saveNewPin() {
    const code = Array.from(newDigits).map(d => d.value).join('');
    if (code.length !== 4) {
      errorEl.textContent = 'Code incomplet';
      return;
    }
    localStorage.setItem('slfp_pin', code);
    changeSection.style.display = 'none';
    document.getElementById('pinSubmit').style.display = '';
    document.getElementById('pinCancel').style.display = '';
    document.getElementById('pinChangeBtn').style.display = '';
    newDigits.forEach(d => d.value = '');
    errorEl.textContent = 'Nouveau code enregistré';
    errorEl.style.color = '#22c55e';
    setTimeout(() => { errorEl.textContent = ''; errorEl.style.color = ''; }, 2000);
  }

  function checkPin() {
    const code = Array.from(digits).map(d => d.value).join('');
    if (code === getPinCode()) {
      sessionStorage.setItem('slfp_auth', '1');
      isPrivate = true;
      overlay.classList.remove('active');
      digits.forEach(d => d.value = '');
      errorEl.textContent = '';
      onPrivateMode();
    } else {
      errorEl.textContent = 'Code incorrect';
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
      // Ensure company fiches exist
      const companyFiches = getSampleFiches().filter(f => ['TIBI', 'BEP', 'EGRETEC'].includes(f.societe));
      for (const cf of companyFiches) {
        if (!fiches.find(f => f.societe === cf.societe)) {
          await fichesRef.doc(cf.id).set(cf);
          fiches.push(cf);
        }
      }
    }
    filteredFiches = getHomeFiches();
    renderCards();
    renderAdminList();
    updateCloudStatus();
    console.log(`Firebase: ${fiches.length} fiches chargées`);
  } catch (error) {
    console.error('Erreur Firebase:', error);
    useFirebase = false;
    loadFiches();
    updateCloudStatus();
  }
}

async function saveFicheToFirebase(ficheData) {
  try {
    const clean = {};
    for (const [key, val] of Object.entries(ficheData)) {
      if (val !== undefined) clean[key] = val;
    }
    await fichesRef.doc(clean.id).set(clean);
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    showNotification('Erreur: ' + (error.message || 'sauvegarde échouée'));
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
  const saved = localStorage.getItem('slfp_fiches');
  const version = localStorage.getItem('slfp_version');
  if (saved && version === '4') {
    fiches = JSON.parse(saved);
  } else {
    fiches = getSampleFiches();
    saveFiches();
    localStorage.setItem('slfp_version', '4');
  }
  filteredFiches = getHomeFiches();
  renderCards();
  renderAdminList();
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
      titre: 'Réforme des retraites 2024',
      societe: 'Gouvernement',
      type: 'reforme',
      couleur: '#D97706',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop',
      contenu: '<h3>Principaux changements</h3><ul><li>Âge légal repoussé à 64 ans</li><li>43 ans de cotisation pour la retraite complète</li><li>Suppression des départs anticipés pour carrière longue</li></ul><h3>Dates d\'application</h3><p>Entrée en vigueur progressive jusqu\'en 2030.</p>',
      dateCreation: '2024-03-20',
      dateMiseAJour: '2024-06-15',
      villesConcernees: ['Toutes les villes'],
      resume: 'Réforme des retraites - repoussement de l\'âge légal'
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
      contenu: '<h3>TIBI - Transport Intermodal de la région</h3><p>Fiche dédiée aux procédures TIBI. À compléter avec les informations spécifiques.</p>',
      dateCreation: '2025-01-01',
      dateMiseAJour: '2025-01-01',
      villesConcernees: [],
      resume: 'Fiche TIBI - Procédures et documents'
    },
    {
      id: '8',
      titre: 'Procédures BEP',
      societe: 'BEP',
      type: 'suivi',
      couleur: '#0891B2',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop',
      logo: 'bep.png',
      contenu: '<h3>BEP - Bureau Économique de la Province</h3><p>Fiche dédiée aux procédures BEP. À compléter avec les informations spécifiques.</p>',
      dateCreation: '2025-01-01',
      dateMiseAJour: '2025-01-01',
      villesConcernees: [],
      resume: 'Fiche BEP - Procédures et documents'
    },
    {
      id: '9',
      titre: 'Procédures EGRETEC',
      societe: 'EGRETEC',
      type: 'suivi',
      couleur: '#0891B2',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop',
      logo: 'IGRETEC.png',
      contenu: '<h3>EGRETEC - Bureau d\'études</h3><p>Fiche dédiée aux procédures EGRETEC. À compléter avec les informations spécifiques.</p>',
      dateCreation: '2025-01-01',
      dateMiseAJour: '2025-01-01',
      villesConcernees: [],
      resume: 'Fiche EGRETEC - Procédures et documents'
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
      resume: 'Plan de développement des mobilités douces dans l\'arrondissement de Namur'
    }
  ];
}

function saveFiches() {
  localStorage.setItem('slfp_fiches', JSON.stringify(fiches));
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
  document.getElementById('cloudLoadBtn').addEventListener('click', loadFromCloud);
  document.getElementById('backupBtn').addEventListener('click', backupData);
  document.getElementById('restoreBtn').addEventListener('click', restoreData);

  setupPagination();
  setupUpdateCloud();
  setupImagePreview();
  setupEditor();
  setupPdfAdd();
}

// ========== PDF LIST MANAGEMENT ==========

let pdfEntries = [];

function renderPdfList() {
  const list = document.getElementById('pdfList');
  list.innerHTML = pdfEntries.map((entry, i) => `
    <div class="pdf-item">
      <div>
        <div class="pdf-item-name">${escHtml(entry.name)}</div>
        ${entry.company ? `<div class="pdf-item-company">${escHtml(entry.company)}</div>` : ''}
      </div>
      <button type="button" class="pdf-item-remove" onclick="removePdfEntry(${i})">×</button>
    </div>
  `).join('');
}

function removePdfEntry(index) {
  pdfEntries.splice(index, 1);
  renderPdfList();
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
      <input type="text" id="pdfCompanyName" placeholder="Nom de l'entreprise (ex: RATP)">
      <input type="file" id="pdfFileInput" accept=".pdf" style="font-size:14px;">
      <div class="pdf-add-actions">
        <button type="button" class="pdf-add-confirm" id="pdfAddConfirm">Ajouter</button>
        <button type="button" class="pdf-add-cancel" id="pdfAddCancel">Annuler</button>
      </div>
    `;
    list.after(form);

    document.getElementById('pdfAddConfirm').addEventListener('click', () => {
      const company = document.getElementById('pdfCompanyName').value.trim();
      const file = document.getElementById('pdfFileInput').files[0];
      if (!file) { showNotification('Sélectionnez un fichier PDF'); return; }

      const reader = new FileReader();
      reader.onload = (e) => {
        pdfEntries.push({
          name: file.name,
          company: company || '',
          data: e.target.result
        });
        renderPdfList();
        form.remove();
      };
      reader.readAsDataURL(file);
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
  return fiches.filter(f => f.type !== 'suivi');
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

  // Group fiches by type
  const grouped = {};
  filteredFiches.forEach(fiche => {
    if (!grouped[fiche.type]) {
      grouped[fiche.type] = [];
    }
    grouped[fiche.type].push(fiche);
  });

  let html = '';
  
  Object.keys(grouped).forEach(type => {
    const fichesOfType = grouped[type];
    html += createStackHTML(fichesOfType, type);
  });

  container.innerHTML = html;

  // Single cards (standalone, not part of a stack)
  container.querySelectorAll('.fiche-card:not(.stack-card)').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });

  container.querySelectorAll('.stack-card').forEach(card => {
    card.addEventListener('click', () => {
      if (isPrivate) {
        editFiche(card.dataset.id);
      } else {
        openModal(card.dataset.id);
      }
    });
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
           style="top: ${top}px; z-index: ${zIndex}; height: ${height}px;${isFront ? '' : ' overflow: hidden;'}">
        <div class="fiche-top-bar" style="background: ${cardColor}"></div>
        <div class="fiche-image-container">
          <img class="fiche-image" src="${fiche.image}" alt="${escHtml(fiche.titre)}" loading="lazy"
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
    <div class="fiche-card" data-id="${fiche.id}">
      <div class="fiche-top-bar" style="background: ${color}"></div>
      <div class="fiche-image-container">
        <img class="fiche-image" src="${fiche.image}" alt="${escHtml(fiche.titre)}" loading="lazy"
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
  window.addEventListener('scroll', () => {
    const container = document.getElementById('cardsContainer');
    const scrollLeft = window.scrollX;
    const cardWidth = container.children[0] ? container.children[0].offsetWidth + 24 : 336;
    const newPage = Math.round(scrollLeft / cardWidth);
    if (newPage !== currentPage) {
      currentPage = newPage;
      updatePagination();
    }
  });
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

  document.getElementById('modalContent').innerHTML = `
    <img class="modal-image" src="${fiche.image}" alt="${fiche.titre}"
         onerror="this.style.background='${color}';this.style.height='220px'">
    <div class="modal-header">
      <span class="modal-type-badge" style="background: ${color}">${label}</span>
      <h2 class="modal-title">${fiche.titre}</h2>
      <p class="modal-societe">${fiche.societe}</p>
    </div>
    <div class="modal-divider"></div>
    <div class="modal-body">
      ${fiche.contenu}
      ${villesHTML}
      ${pdfHTML}
    </div>
    <div class="modal-date">
      <img src="logo-slfp.png" alt="SLFP" style="height:20px;vertical-align:middle;margin-right:8px">
      Créé le ${formatDate(fiche.dateCreation)} · Mis à jour le ${formatDate(fiche.dateMiseAJour)}
    </div>
  `;

  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function previewPDF(id) {
  const fiche = fiches.find(f => f.id === id);
  if (!fiche || !fiche.fichierPdf) return;
  
  const previewWindow = window.open('', '_blank');
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${fiche.pdfNom || 'Document PDF'} - ${fiche.titre}</title>
      <style>
        body { margin: 0; padding: 0; }
        iframe { width: 100%; height: 100vh; border: none; }
      </style>
    </head>
    <body>
      <iframe src="${fiche.fichierPdf}"></iframe>
    </body>
    </html>
  `);
}

function previewPdfData(id, index) {
  const fiche = fiches.find(f => f.id === id);
  if (!fiche || !fiche.pdfs || !fiche.pdfs[index]) return;
  
  const pdf = fiche.pdfs[index];
  const previewWindow = window.open('', '_blank');
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${pdf.name}</title>
      <style>
        body { margin: 0; padding: 0; }
        iframe { width: 100%; height: 100vh; border: none; }
      </style>
    </head>
    <body>
      <iframe src="${pdf.data}"></iframe>
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

function updateRoiLogos() {
  const companies = ['TIBI', 'BEP', 'EGRETEC'];
  for (const company of companies) {
    const fiche = fiches.find(f => f.societe === company);
    const img = document.getElementById('roiLogo' + company);
    if (fiche && fiche.logo && img) {
      img.src = fiche.logo;
      img.style.display = '';
    } else if (img) {
      img.style.display = 'none';
    }
  }
}

function openCompanyFiche(company) {
  document.querySelectorAll('.roi-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.roi-btn[data-company="${company}"]`)?.classList.add('active');
  const fiche = fiches.find(f => f.societe === company);
  if (fiche) {
    document.getElementById('searchInput').value = '';
    currentFilter = 'all';
    document.getElementById('filterSelect').value = 'all';
    filteredFiches = getHomeFiches();
    renderCards();
    updatePagination();
    openModal(fiche.id);
  } else {
    document.getElementById('searchInput').value = company;
    handleSearch({ target: document.getElementById('searchInput') });
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

function renderAdminList() {
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
                <div class="admin-fiche-title">${fiche.titre}</div>
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
  setEditorContent('');
  document.getElementById('ficheVilles').value = '';
  setResumeContent('');
  setPdfEntries([]);
  window.googleDriveFileData = null;
  window.imageFileData = null;
  const imagePreviewImg = document.getElementById('imagePreviewImg');
  const imagePlaceholder = document.getElementById('imagePlaceholder');
  if (imagePreviewImg) imagePreviewImg.style.display = 'none';
  if (imagePlaceholder) imagePlaceholder.style.display = 'block';
  document.getElementById('adminModalOverlay').classList.add('active');
}

function editFiche(id) {
  const fiche = fiches.find(f => f.id === id);
  if (!fiche) return;

  document.getElementById('adminModalTitle').textContent = 'Modifier la fiche';
  document.getElementById('ficheId').value = fiche.id;
  document.getElementById('ficheTitre').value = fiche.titre;
  document.getElementById('ficheSociete').value = fiche.societe;
  document.getElementById('ficheType').value = fiche.type;
  document.getElementById('ficheImage').value = '';
  setEditorContent(fiche.contenu);
  document.getElementById('ficheVilles').value = fiche.villesConcernees ? fiche.villesConcernees.join(', ') : '';
  setResumeContent(fiche.resume || '');
  
  // Load existing PDFs
  setPdfEntries(fiche.pdfs || []);
  
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
}

function handleFormSubmit(e) {
  if (e) e.preventDefault();

  const id = document.getElementById('ficheId').value;
  const type = document.getElementById('ficheType').value;
  const villesStr = document.getElementById('ficheVilles').value;
  const imageFileData = window.imageFileData;

  let imageValue = document.getElementById('ficheImage').value;
  if (imageFileData) {
    imageValue = imageFileData;
  } else if (!imageValue && id) {
    const existing = fiches.find(f => f.id === id);
    if (existing && existing.image) {
      imageValue = existing.image;
    }
  }

  const ficheData = {
    id: id || Date.now().toString(),
    titre: document.getElementById('ficheTitre').value,
    societe: document.getElementById('ficheSociete').value,
    type: type,
    couleur: colors[type] || '#0052A5',
    image: imageValue || `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400"><rect fill="${encodeURIComponent(colors[type] || '#0052A5')}" width="800" height="400"/><text x="400" y="200" text-anchor="middle" dy=".3em" fill="white" font-size="48" font-family="sans-serif">SLFP</text></svg>`,
    contenu: getEditorContent(),
    villesConcernees: villesStr ? villesStr.split(',').map(v => v.trim()).filter(v => v) : [],
    resume: getResumeContent(),
    pdfs: pdfEntries.length > 0 ? pdfEntries.map(p => ({ name: p.name, company: p.company, data: p.data })) : [],
    fichierPdf: null,
    pdfNom: null,
    googleDriveLink: null,
    dateCreation: id ? (fiches.find(f => f.id === id)?.dateCreation || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
    dateMiseAJour: new Date().toISOString().split('T')[0]
  };

  saveAndClose(ficheData, id);
}

async function saveAndClose(ficheData, id) {
  if (useFirebase) {
    const success = await saveFicheToFirebase(ficheData);
    if (!success) return;
  }
  
  if (id) {
    const index = fiches.findIndex(f => f.id === id);
    if (index !== -1) fiches[index] = ficheData;
  } else {
    fiches.push(ficheData);
  }

  if (!useFirebase) {
    saveFiches();
  }
  
  filteredFiches = currentFilter === 'all'
    ? getHomeFiches()
    : fiches.filter(f => f.type === currentFilter);
  renderCards();
  renderAdminList();
  updatePagination();
  closeAdminModal();
  showNotification(id ? 'Fiche modifiée' : 'Fiche créée');
}
