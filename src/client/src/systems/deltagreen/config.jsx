// src/client/src/systems/deltagreen/config.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration CLIENT du système Delta Green (BRP percentile D100).
// Point d'entrée unique pour tout ce qui est spécifique au système côté client :
//   - Métadonnées slug
//   - Hooks diceEngine v2
//   - Données statiques : compétences de base, professions, situations SAN, tags GM
//   - Defaults dés
//
// ⚠️  Aucun lien avec src/server/systems/deltagreen/config.js (Node.js).
//     Ce fichier est un module ES, importé uniquement par le frontend React.
// ─────────────────────────────────────────────────────────────────────────────

import { RollError } from '../../tools/diceEngine.js';
import DiceEntryHistory from "./components/layout/DiceEntryHistory.jsx";

// ══════════════════════════════════════════════════════════════════════════════
// DONNÉES STATIQUES
// ══════════════════════════════════════════════════════════════════════════════

// ── Compétences de base ───────────────────────────────────────────────────────
// Ordre : ordre d'affichage sur la fiche officielle DD 315.
// hasSpecialty : peut avoir des lignes de spécialité en plus de la base.
// base : score de départ (avant points de profession / bonus).

export const BASE_SKILLS = [
    { key: 'anthropologie',     label: 'Anthropologie',       base: 0,  hasSpecialty: false },
    { key: 'archeologie',       label: 'Archéologie',         base: 0,  hasSpecialty: false },
    { key: 'armes_feu',         label: 'Armes à feu',         base: 20, hasSpecialty: false },
    { key: 'armes_melee',       label: 'Armes de mêlée',      base: 30, hasSpecialty: false },
    { key: 'armes_lourdes',     label: 'Armes lourdes',       base: 0,  hasSpecialty: false },
    { key: 'art',               label: 'Art',                 base: 0,  hasSpecialty: true  },
    { key: 'artillerie',        label: 'Artillerie',          base: 0,  hasSpecialty: false },
    { key: 'artisanat',         label: 'Artisanat',           base: 0,  hasSpecialty: true  },
    { key: 'athletisme',        label: 'Athlétisme',          base: 30, hasSpecialty: false },
    { key: 'bureaucratie',      label: 'Bureaucratie',        base: 10, hasSpecialty: false },
    { key: 'chirurgie',         label: 'Chirurgie',           base: 0,  hasSpecialty: false },
    { key: 'combat_mains_nues', label: 'Combat à mains nues', base: 40, hasSpecialty: false },
    { key: 'comptabilite',      label: 'Comptabilité',        base: 10, hasSpecialty: false },
    { key: 'conduite',          label: 'Conduite',            base: 20, hasSpecialty: false },
    { key: 'criminalistique',   label: 'Criminalistique',     base: 0,  hasSpecialty: false },
    { key: 'criminologie',      label: 'Criminologie',        base: 10, hasSpecialty: false },
    { key: 'deguisement',       label: 'Déguisement',         base: 10, hasSpecialty: false },
    { key: 'discretion',        label: 'Discrétion',          base: 10, hasSpecialty: false },
    { key: 'droit',             label: 'Droit',               base: 0,  hasSpecialty: false },
    { key: 'engins_lourds',     label: 'Engins lourds',       base: 10, hasSpecialty: false },
    { key: 'equitation',        label: 'Équitation',          base: 10, hasSpecialty: false },
    { key: 'esquive',           label: 'Esquive',             base: 30, hasSpecialty: false },
    { key: 'explosifs',         label: 'Explosifs',           base: 0,  hasSpecialty: false },
    { key: 'histoire',          label: 'Histoire',            base: 10, hasSpecialty: false },
    { key: 'inconcevable',      label: 'Inconcevable',        base: 0,  hasSpecialty: false },
    { key: 'informatique',      label: 'Informatique',        base: 0,  hasSpecialty: false },
    { key: 'medecine',          label: 'Médecine',            base: 0,  hasSpecialty: false },
    { key: 'natation',          label: 'Natation',            base: 20, hasSpecialty: false },
    { key: 'occultisme',        label: 'Occultisme',          base: 10, hasSpecialty: false },
    { key: 'orientation',       label: 'Orientation',         base: 10, hasSpecialty: false },
    { key: 'persuasion',        label: 'Persuasion',          base: 20, hasSpecialty: false },
    { key: 'pharmacologie',     label: 'Pharmacologie',       base: 0,  hasSpecialty: false },
    { key: 'pilotage',          label: 'Pilotage',            base: 0,  hasSpecialty: true  },
    { key: 'premiers_secours',  label: 'Premiers secours',    base: 10, hasSpecialty: false },
    { key: 'psychotherapie',    label: 'Psychothérapie',      base: 10, hasSpecialty: false },
    { key: 'recherche',         label: 'Recherche',           base: 20, hasSpecialty: false },
    { key: 'rohum',             label: 'ROHUM',               base: 10, hasSpecialty: false },
    { key: 'roem',              label: 'ROEM',                base: 0,  hasSpecialty: false },
    { key: 'science',           label: 'Science',             base: 0,  hasSpecialty: true  },
    { key: 'sciences_mili',     label: 'Sciences militaires', base: 0,  hasSpecialty: true  },
    { key: 'survie',            label: 'Survie',              base: 10, hasSpecialty: false },
    { key: 'vigilance',         label: 'Vigilance',           base: 20, hasSpecialty: false },
];

// ── Lookup rapide par clé ─────────────────────────────────────────────────────
export const SKILL_BY_KEY = Object.fromEntries(BASE_SKILLS.map(s => [s.key, s]));

// ── Situations de perte de SAN ────────────────────────────────────────────────
// success / failure : notations texte ('0', '1', '1D4', '1D6', '1D8', '1D10')
// category : groupe d'affichage dans la modale

export const SAN_SITUATIONS = [
    // ── Violence — victime ────────────────────────────────────────────────────
    { category: 'violence_victime', label: 'Être pris dans une fusillade',                    success: '0', failure: '1'    },
    { category: 'violence_victime', label: 'Trouver un cadavre',                              success: '0', failure: '1'    },
    { category: 'violence_victime', label: "Trouver le cadavre d'un être cher",               success: '0', failure: '1D4'  },
    { category: 'violence_victime', label: 'Se faire poignarder ou étrangler par surprise',   success: '0', failure: '1D4'  },
    { category: 'violence_victime', label: 'Être réduit à 2 PV ou moins',                    success: '0', failure: '1D6'  },
    { category: 'violence_victime', label: 'Se faire torturer',                               success: '0', failure: '1D10' },

    // ── Violence — auteur ─────────────────────────────────────────────────────
    { category: 'violence_auteur',  label: 'Immobiliser ou estropier un innocent',            success: '0', failure: '1D4'  },
    { category: 'violence_auteur',  label: 'Mettre des corps dans un incinérateur',           success: '0', failure: '1D4'  },
    { category: 'violence_auteur',  label: 'Tuer pour se défendre',                           success: '0', failure: '1D4'  },
    { category: 'violence_auteur',  label: 'Tuer un assassin de sang-froid',                  success: '0', failure: '1D6'  },
    { category: 'violence_auteur',  label: 'Torturer une victime',                            success: '0', failure: '1D8'  },
    { category: 'violence_auteur',  label: 'Tuer accidentellement un innocent',               success: '0', failure: '1D8'  },
    { category: 'violence_auteur',  label: 'Tuer un innocent de sang-froid',                  success: '1', failure: '1D10' },

    // ── Impuissance ───────────────────────────────────────────────────────────
    { category: 'impuissance',      label: 'Être licencié',                                   success: '0', failure: '1'    },
    { category: 'impuissance',      label: "Un ami souffre d'une blessure permanente",        success: '0', failure: '1'    },
    { category: 'impuissance',      label: "Le score d'une Attache tombe à 0",                success: '0', failure: '1D4'  },
    { category: 'impuissance',      label: 'Être condamné à une peine de prison',             success: '0', failure: '1D4'  },
    { category: 'impuissance',      label: 'Se réveiller aveugle ou paralysé',                success: '0', failure: '1D4'  },
    { category: 'impuissance',      label: "Découvrir la dépouille d'un ami",                 success: '0', failure: '1D4'  },
    { category: 'impuissance',      label: 'Atterrir dans une fosse de cadavres',             success: '0', failure: '1D4'  },
    { category: 'impuissance',      label: "Une Attache souffre d'une blessure permanente",   success: '1', failure: '1D4'  },
    { category: 'impuissance',      label: "Voir ou entendre un ami subir une mort atroce",   success: '0', failure: '1D6'  },
    { category: 'impuissance',      label: "Mort d'une Attache",                              success: '1', failure: '1D6'  },
    { category: 'impuissance',      label: "Voir ou entendre une Attache subir une mort atroce", success: '1', failure: '1D8' },

    // ── L'Inconcevable ────────────────────────────────────────────────────────
    { category: 'inconcevable',     label: "Utiliser Psychothérapie sur un personnage affecté par l'Inconcevable", success: '0', failure: '1'   },
    { category: 'inconcevable',     label: 'Être témoin d\'un phénomène surnaturel bénin',    success: '0', failure: '1'   },
    { category: 'inconcevable',     label: 'Être témoin d\'un phénomène surnaturel violent',  success: '0', failure: '1D6' },
    { category: 'inconcevable',     label: 'Voir un cadavre se déplacer',                     success: '0', failure: '1D6' },
    { category: 'inconcevable',     label: 'Subir un effet ouvertement surnaturel',           success: '0', failure: '1D6' },
    { category: 'inconcevable',     label: 'Subir un assaut surnaturel violent',              success: '1', failure: '1D8' },
];

// Labels des catégories de situations
export const SAN_CATEGORIES = {
    violence_victime: 'Violence — Victime',
    violence_auteur:  'Violence — Auteur',
    impuissance:      'Impuissance',
    inconcevable:     "L'Inconcevable",
};

// ── Professions ───────────────────────────────────────────────────────────────
// Chaque profession liste les compétences préremplies au score indiqué.
// choices : blocs de compétences optionnelles (le joueur choisit N parmi la liste).
// bondsCount : nombre d'Attaches.

export const PROFESSIONS = [
    {
        key:        'anthropologue',
        label:      'Anthropologue / Historien',
        bondsCount: 4,
        recommended: ['int'],
        skills: [
            { key: 'bureaucratie', score: 40 },
            { key: 'histoire',     score: 60 },
            { key: 'occultisme',   score: 40 },
            { key: 'persuasion',   score: 40 },
        ],
        skillsOr: [
            { pick: 1, options: [
                    { key: 'anthropologie', score: 50 },
                    { key: 'archeologie',   score: 50 },
                ]},
        ],
        choices: [
            { pick: 2, options: [
                    { key: 'anthropologie', score: 40 },
                    { key: 'archeologie',   score: 40 },
                    { key: 'rohum',         score: 50 },
                    { key: 'orientation',   score: 50 },
                    { key: 'equitation',    score: 50 },
                    { key: 'recherche',     score: 60 },
                    { key: 'survie',        score: 50 },
                ]},
        ],
        languages: 2, // Langues étrangères imposées
    },
    {
        key:        'informaticien',
        label:      'Informaticien / Ingénieur',
        bondsCount: 3,
        recommended: ['int'],
        skills: [
            { key: 'informatique', score: 60 },
            { key: 'roem',         score: 40 },
        ],
        specialties: [
            { key: 'artisanat', specialty: 'Électricien',      score: 30 },
            { key: 'artisanat', specialty: 'Mécanicien',       score: 30 },
            { key: 'artisanat', specialty: 'Microélectronique',score: 40 },
            { key: 'science',   specialty: 'Mathématiques',    score: 40 },
        ],
        choices: [
            { pick: 4, options: [
                    { key: 'comptabilite', score: 50 },
                    { key: 'bureaucratie', score: 50 },
                    { key: 'engins_lourds',score: 50 },
                    { key: 'droit',        score: 40 },
                ]},
        ],
    },
    {
        key:        'agent_federal',
        label:      'Agent fédéral',
        bondsCount: 3,
        recommended: ['con', 'pow', 'cha'],
        skills: [
            { key: 'vigilance',      score: 50 },
            { key: 'bureaucratie',   score: 40 },
            { key: 'criminologie',   score: 50 },
            { key: 'conduite',       score: 50 },
            { key: 'armes_feu',      score: 50 },
            { key: 'criminalistique',score: 30 },
            { key: 'rohum',          score: 60 },
            { key: 'droit',          score: 30 },
            { key: 'persuasion',     score: 50 },
            { key: 'recherche',      score: 50 },
            { key: 'combat_mains_nues', score: 60 },
        ],
        choices: [
            { pick: 1, options: [
                    { key: 'comptabilite',  score: 60 },
                    { key: 'informatique',  score: 50 },
                    { key: 'armes_lourdes', score: 50 },
                    { key: 'pharmacologie', score: 50 },
                ]},
        ],
    },
    {
        key:        'medecin',
        label:      'Médecin',
        bondsCount: 3,
        recommended: ['int', 'pow', 'dex'],
        skills: [
            { key: 'bureaucratie',   score: 50 },
            { key: 'premiers_secours', score: 60 },
            { key: 'medecine',       score: 60 },
            { key: 'persuasion',     score: 40 },
            { key: 'pharmacologie',  score: 50 },
            { key: 'recherche',      score: 40 },
        ],
        specialties: [
            { key: 'science', specialty: 'Biologie', score: 60 },
        ],
        choices: [
            { pick: 2, options: [
                    { key: 'criminalistique', score: 50 },
                    { key: 'psychotherapie',  score: 60 },
                    { key: 'chirurgie',       score: 50 },
                ]},
        ],
    },
    {
        key:        'scientifique',
        label:      'Scientifique',
        bondsCount: 4,
        recommended: ['int'],
        skills: [
            { key: 'bureaucratie', score: 40 },
            { key: 'informatique', score: 40 },
        ],
        specialtiesFixed: [
            { key: 'science', specialty: null,    score: 60, pick: true, label: 'Science (choix)' },
            { key: 'science', specialty: null,    score: 50, pick: true, label: 'Science (autre)' },
            { key: 'science', specialty: null,    score: 50, pick: true, label: 'Science (autre)' },
        ],
        choices: [
            { pick: 3, options: [
                    { key: 'comptabilite',  score: 50 },
                    { key: 'criminalistique', score: 40 },
                    { key: 'droit',         score: 40 },
                    { key: 'pharmacologie', score: 40 },
                ]},
        ],
    },
    {
        key:        'forces_speciales',
        label:      'Opérateur forces spéciales',
        bondsCount: 2,
        recommended: ['str', 'con', 'pow'],
        skills: [
            { key: 'vigilance',      score: 60 },
            { key: 'athletisme',     score: 60 },
            { key: 'explosifs',      score: 40 },
            { key: 'armes_feu',      score: 60 },
            { key: 'armes_lourdes',  score: 50 },
            { key: 'armes_melee',    score: 50 },
            { key: 'orientation',    score: 50 },
            { key: 'discretion',     score: 50 },
            { key: 'survie',         score: 50 },
            { key: 'natation',       score: 50 },
            { key: 'combat_mains_nues', score: 60 },
        ],
        specialties: [
            { key: 'sciences_mili', specialty: 'Terrestre', score: 60 },
        ],
        choices: [],
    },
    {
        key:        'criminel',
        label:      'Criminel',
        bondsCount: 4,
        recommended: ['str', 'dex'],
        skills: [
            { key: 'vigilance',    score: 50 },
            { key: 'criminologie', score: 60 },
            { key: 'esquive',      score: 40 },
            { key: 'conduite',     score: 50 },
            { key: 'armes_feu',    score: 40 },
            { key: 'droit',        score: 40 },
            { key: 'armes_melee',  score: 40 },
            { key: 'persuasion',   score: 50 },
            { key: 'discretion',   score: 50 },
            { key: 'combat_mains_nues', score: 50 },
        ],
        choices: [
            { pick: 2, options: [
                    { key: 'explosifs',     score: 40 },
                    { key: 'deguisement',   score: 50 },
                    { key: 'criminalistique', score: 40 },
                    { key: 'rohum',         score: 50 },
                    { key: 'orientation',   score: 50 },
                    { key: 'occultisme',    score: 50 },
                    { key: 'pharmacologie', score: 40 },
                ]},
        ],
    },
    {
        key:        'pompier',
        label:      'Pompier',
        bondsCount: 3,
        recommended: ['str', 'dex', 'con'],
        skills: [
            { key: 'vigilance',       score: 50 },
            { key: 'athletisme',      score: 60 },
            { key: 'explosifs',       score: 50 },
            { key: 'conduite',        score: 50 },
            { key: 'premiers_secours',score: 50 },
            { key: 'criminalistique', score: 40 },
            { key: 'engins_lourds',   score: 50 },
            { key: 'orientation',     score: 50 },
            { key: 'recherche',       score: 40 },
        ],
        specialties: [
            { key: 'artisanat', specialty: 'Électricien', score: 40 },
            { key: 'artisanat', specialty: 'Mécanicien',  score: 40 },
        ],
        choices: [],
    },
    {
        key:        'affaires_etrangeres',
        label:      'Agent des affaires étrangères',
        bondsCount: 3,
        recommended: ['int', 'cha'],
        skills: [
            { key: 'comptabilite', score: 40 },
            { key: 'anthropologie',score: 40 },
            { key: 'bureaucratie', score: 60 },
            { key: 'histoire',     score: 40 },
            { key: 'rohum',        score: 50 },
            { key: 'droit',        score: 40 },
            { key: 'persuasion',   score: 50 },
        ],
        languages: 3,
        choices: [],
    },
    {
        key:        'analyste_renseignement',
        label:      'Analyste du renseignement',
        bondsCount: 3,
        recommended: ['int'],
        skills: [
            { key: 'anthropologie', score: 40 },
            { key: 'bureaucratie',  score: 50 },
            { key: 'informatique',  score: 40 },
            { key: 'criminologie',  score: 40 },
            { key: 'histoire',      score: 40 },
            { key: 'rohum',         score: 50 },
            { key: 'roem',          score: 40 },
        ],
        languages: 3,
        choices: [],
    },
    {
        key:        'officier_traitant',
        label:      'Officier traitant du renseignement',
        bondsCount: 2,
        recommended: ['int', 'pow', 'cha'],
        skills: [
            { key: 'vigilance',    score: 50 },
            { key: 'bureaucratie', score: 40 },
            { key: 'criminologie', score: 50 },
            { key: 'deguisement',  score: 50 },
            { key: 'conduite',     score: 40 },
            { key: 'armes_feu',    score: 40 },
            { key: 'rohum',        score: 60 },
            { key: 'persuasion',   score: 60 },
            { key: 'roem',         score: 40 },
            { key: 'discretion',   score: 50 },
            { key: 'combat_mains_nues', score: 50 },
        ],
        languages: 2,
        choices: [],
    },
    {
        key:        'avocat',
        label:      'Avocat / Dirigeant d\'entreprise',
        bondsCount: 4,
        recommended: ['int', 'cha'],
        skills: [
            { key: 'comptabilite', score: 50 },
            { key: 'bureaucratie', score: 50 },
            { key: 'rohum',        score: 40 },
            { key: 'persuasion',   score: 60 },
        ],
        choices: [
            { pick: 4, options: [
                    { key: 'informatique', score: 50 },
                    { key: 'criminologie', score: 60 },
                    { key: 'droit',        score: 50 },
                    { key: 'pharmacologie',score: 50 },
                ]},
        ],
    },
    {
        key:        'medias',
        label:      'Spécialiste médias',
        bondsCount: 4,
        recommended: ['int', 'cha'],
        skills: [
            { key: 'histoire',  score: 40 },
            { key: 'rohum',     score: 40 },
            { key: 'persuasion',score: 50 },
        ],
        specialtiesFixed: [
            { key: 'art', specialty: null, score: 60, pick: true, label: 'Art (Écriture, Journalisme…)' },
        ],
        choices: [
            { pick: 5, options: [
                    { key: 'anthropologie', score: 40 },
                    { key: 'archeologie',   score: 40 },
                    { key: 'bureaucratie',  score: 50 },
                    { key: 'informatique',  score: 40 },
                    { key: 'criminologie',  score: 50 },
                    { key: 'droit',         score: 40 },
                    { key: 'occultisme',    score: 50 },
                ]},
        ],
    },
    {
        key:        'infirmier',
        label:      'Infirmier / Ambulancier',
        bondsCount: 4,
        recommended: ['int', 'pow', 'cha'],
        skills: [
            { key: 'vigilance',      score: 40 },
            { key: 'bureaucratie',   score: 40 },
            { key: 'premiers_secours', score: 60 },
            { key: 'rohum',          score: 40 },
            { key: 'medecine',       score: 40 },
            { key: 'persuasion',     score: 40 },
            { key: 'pharmacologie',  score: 40 },
        ],
        specialties: [
            { key: 'science', specialty: 'Biologie', score: 40 },
        ],
        choices: [
            { pick: 2, options: [
                    { key: 'conduite',      score: 60 },
                    { key: 'criminalistique', score: 40 },
                    { key: 'orientation',   score: 50 },
                    { key: 'psychotherapie',score: 50 },
                    { key: 'recherche',     score: 60 },
                ]},
        ],
    },
    {
        key:        'pilote',
        label:      'Pilote / Marin',
        bondsCount: 3,
        recommended: ['dex', 'int'],
        skills: [
            { key: 'vigilance',  score: 60 },
            { key: 'bureaucratie', score: 30 },
            { key: 'orientation',score: 50 },
            { key: 'natation',   score: 40 },
        ],
        specialties: [
            { key: 'artisanat', specialty: 'Électricien', score: 40 },
            { key: 'artisanat', specialty: 'Mécanicien',  score: 40 },
        ],
        specialtiesFixed: [
            { key: 'pilotage', specialty: null, score: 60, pick: true, label: 'Pilotage (choix)' },
        ],
        choices: [
            { pick: 2, options: [
                    { key: 'armes_lourdes', score: 50 },
                ]},
        ],
    },
    {
        key:        'officier_police',
        label:      'Officier de police',
        bondsCount: 3,
        recommended: ['str', 'con', 'pow'],
        skills: [
            { key: 'vigilance',    score: 60 },
            { key: 'bureaucratie', score: 40 },
            { key: 'criminologie', score: 40 },
            { key: 'conduite',     score: 50 },
            { key: 'armes_feu',    score: 40 },
            { key: 'premiers_secours', score: 30 },
            { key: 'rohum',        score: 50 },
            { key: 'droit',        score: 30 },
            { key: 'armes_melee',  score: 50 },
            { key: 'orientation',  score: 40 },
            { key: 'persuasion',   score: 40 },
            { key: 'recherche',    score: 40 },
            { key: 'combat_mains_nues', score: 60 },
        ],
        choices: [
            { pick: 1, options: [
                    { key: 'criminalistique', score: 50 },
                    { key: 'engins_lourds',   score: 60 },
                    { key: 'armes_lourdes',   score: 50 },
                    { key: 'equitation',      score: 60 },
                ]},
        ],
    },
    {
        key:        'directeur_programme',
        label:      'Directeur de programme',
        bondsCount: 4,
        recommended: ['int', 'cha'],
        skills: [
            { key: 'comptabilite', score: 60 },
            { key: 'bureaucratie', score: 60 },
            { key: 'informatique', score: 50 },
            { key: 'criminologie', score: 30 },
            { key: 'histoire',     score: 40 },
            { key: 'droit',        score: 40 },
            { key: 'persuasion',   score: 50 },
        ],
        languages: 1,
        choices: [
            { pick: 1, options: [
                    { key: 'anthropologie', score: 30 },
                ]},
        ],
    },
    {
        key:        'soldat',
        label:      'Soldat / Marine',
        bondsCount: 4,
        recommended: ['str', 'con'],
        skills: [
            { key: 'vigilance',    score: 50 },
            { key: 'athletisme',   score: 50 },
            { key: 'bureaucratie', score: 30 },
            { key: 'conduite',     score: 40 },
            { key: 'armes_feu',    score: 40 },
            { key: 'premiers_secours', score: 40 },
            { key: 'orientation',  score: 40 },
            { key: 'persuasion',   score: 30 },
            { key: 'combat_mains_nues', score: 50 },
        ],
        specialties: [
            { key: 'sciences_mili', specialty: 'Terrestre', score: 40 },
        ],
        choices: [
            { pick: 3, options: [
                    { key: 'artillerie',   score: 40 },
                    { key: 'informatique', score: 40 },
                    { key: 'explosifs',    score: 40 },
                    { key: 'engins_lourds',score: 50 },
                    { key: 'armes_lourdes',score: 40 },
                    { key: 'recherche',    score: 60 },
                    { key: 'roem',         score: 40 },
                    { key: 'natation',     score: 60 },
                ]},
        ],
    },
    {
        key:        'personnalise',
        label:      'Profession personnalisée',
        bondsCount: 3, // modifiable : -1 Bond = +50 pts, +1 Bond = -50 pts
        recommended: [],
        skills:     [],
        choices:    [],
        custom:     true, // flag : wizard affiche l'interface de personnalisation
    },
];

// ── Tags GM prédéfinis ────────────────────────────────────────────────────────
// Structure : { key, label, color (text), bgColor (background) }

export const GM_TAGS = [
    { key: 'epuise',         label: 'Épuisé',             color: '#92400e', bgColor: '#fef3c7' },
    { key: 'vol_bas',        label: 'VOL bas',            color: '#1e40af', bgColor: '#dbeafe' },
    { key: 'insomnie',       label: 'Insomnie',           color: '#4b5563', bgColor: '#f3f4f6' },
    { key: 'stimulants',     label: 'Stimulants',         color: '#065f46', bgColor: '#d1fae5' },
    { key: 'blesse',         label: 'Blessé',             color: '#991b1b', bgColor: '#fee2e2' },
    { key: 'adapte_violence',label: 'Adapté Violence',    color: '#1e3a5f', bgColor: '#e0f2fe' },
    { key: 'adapte_impu',    label: 'Adapté Impuissance', color: '#3b0764', bgColor: '#f3e8ff' },
    { key: 'sous_traitement',label: 'Sous traitement',    color: '#064e3b', bgColor: '#ecfdf5' },
    { key: 'surveille',      label: 'Surveillé',          color: '#78350f', bgColor: '#fff7ed' },
];

// ── Catalogue d'armement ──────────────────────────────────────────────────────
// Source : Delta Green Agent's Handbook (Arc Dream Publishing).
// skill_ref : clé de compétence ou de stat (str/dex/…) pour resolveSkillRef.
// damage    : notation rpg-dice-roller complète, ou null si létalité seule.
// lethality : entier (10 = 10%), null si N/A.
export const WEAPON_CATALOG = [
    {
        key: 'melee', label: 'Corps à corps',
        items: [
            { name: 'Attaque à mains nues',               skill_ref: 'combat_mains_nues', skill_label: 'Combat mains nues', range: 'Contact', damage: '1d4-1', armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: '' },
            { name: 'Poing américain / matraque légère',   skill_ref: 'combat_mains_nues', skill_label: 'Combat mains nues', range: 'Contact', damage: '1d4',   armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: '' },
            { name: 'Garrot',                             skill_ref: 'combat_mains_nues', skill_label: 'Combat mains nues', range: 'Contact', damage: null,    armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: 'Depuis la surprise. 1D6 dgts/round, cible immobilisée et silencieuse.' },
            { name: 'Couteau',                            skill_ref: 'armes_melee',       skill_label: 'Armes de mêlée',    range: 'Contact', damage: '1d4',   armor_piercing: '3',   lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: '' },
            { name: 'Hachette',                           skill_ref: 'armes_melee',       skill_label: 'Armes de mêlée',    range: 'Contact', damage: '1d4',   armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: '' },
            { name: 'Grand couteau / dague de combat',    skill_ref: 'armes_melee',       skill_label: 'Armes de mêlée',    range: 'Contact', damage: '1d6',   armor_piercing: '3',   lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: '' },
            { name: 'Matraque / bâton / bâton télescopique', skill_ref: 'armes_melee',   skill_label: 'Armes de mêlée',    range: 'Contact', damage: '1d6',   armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: '' },
            { name: 'Machette / tomahawk / épée courte',  skill_ref: 'armes_melee',       skill_label: 'Armes de mêlée',    range: 'Contact', damage: '1d8',   armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: '' },
            { name: 'Crosse / batte de baseball',         skill_ref: 'armes_melee',       skill_label: 'Armes de mêlée',    range: 'Contact', damage: '1d8',   armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: '' },
            { name: 'Lance / baïonnette',                 skill_ref: 'armes_melee',       skill_label: 'Armes de mêlée',    range: 'Contact', damage: '1d8',   armor_piercing: '3',   lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: '' },
            { name: 'Hache',                              skill_ref: 'armes_melee',       skill_label: 'Armes de mêlée',    range: 'Contact', damage: '1d10',  armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: false, notes: '' },
            { name: 'Grande épée',                        skill_ref: 'armes_melee',       skill_label: 'Armes de mêlée',    range: 'Contact', damage: '1d10',  armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Standard',   is_restricted: false, notes: '' },
            { name: 'Épée à deux mains',                  skill_ref: 'armes_melee',       skill_label: 'Armes de mêlée',    range: 'Contact', damage: '1d12',  armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Standard',   is_restricted: false, notes: 'Entraînement spécial requis.' },
        ],
    },
    {
        key: 'less_lethal', label: 'Moins létales',
        items: [
            { name: 'Spray poivre (petit)',               skill_ref: 'dex',               skill_label: 'DEX×5',             range: '1 m.',   damage: null,    armor_piercing: null,  lethality: null, ammo_capacity: 1,  expense: 'Incidental', is_restricted: false, notes: 'Pénalité −20% à la cible.' },
            { name: 'Spray poivre (bombe)',               skill_ref: 'dex',               skill_label: 'DEX×5',             range: '3 m.',   damage: null,    armor_piercing: null,  lethality: null, ammo_capacity: 12, expense: 'Incidental', is_restricted: false, notes: 'Jusqu\'à 2 cibles, pénalité −20%.' },
            { name: 'Pistolet à aiguillon (CEDeux)',      skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '4 m.',   damage: null,    armor_piercing: null,  lethality: null, ammo_capacity: 4,  expense: 'Standard',   is_restricted: false, notes: 'Pénalité −20%. Entraînement requis.' },
            { name: 'Pistolet incapacitant',              skill_ref: 'dex',               skill_label: 'DEX×5',             range: '1 m.',   damage: null,    armor_piercing: null,  lethality: null, ammo_capacity: 10, expense: 'Incidental', is_restricted: false, notes: 'Pénalité −20% à la cible.' },
            { name: 'Fusil à pompe (non létal)',          skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '10 m.',  damage: '1d6',   armor_piercing: null,  lethality: null, ammo_capacity: 5,  expense: 'Standard',   is_restricted: false, notes: 'Cible étourdie.' },
        ],
    },
    {
        key: 'grenades', label: 'Grenades',
        items: [
            { name: 'Grenade à main',                     skill_ref: 'athletisme',        skill_label: 'Athlétisme',         range: '20 m.',  damage: null,    armor_piercing: null,  lethality: 15, ammo_capacity: null, expense: 'Incidental',  is_restricted: true,  notes: 'Rayon 10 m.' },
            { name: 'Grenade lacrymogène (lancée)',        skill_ref: 'athletisme',        skill_label: 'Athlétisme',         range: '20 m.',  damage: null,    armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: true,  notes: 'Rayon 10 m. Pénalité −40%.' },
            { name: 'Grenade flash-bang (lancée)',         skill_ref: 'athletisme',        skill_label: 'Athlétisme',         range: '20 m.',  damage: null,    armor_piercing: null,  lethality: null, ammo_capacity: null, expense: 'Incidental', is_restricted: true,  notes: 'Rayon 10 m. Pénalité −40%. Rayon ÷2 en extérieur.' },
            { name: 'Grenade lacrymogène (lanceur)',       skill_ref: 'armes_lourdes',     skill_label: 'Armes lourdes',      range: '50 m.',  damage: null,    armor_piercing: null,  lethality: null, ammo_capacity: 1,  expense: 'Unusual',    is_restricted: true,  notes: 'Rayon 10 m. Pénalité −40%.' },
            { name: 'Grenade flash-bang (lanceur)',        skill_ref: 'armes_lourdes',     skill_label: 'Armes lourdes',      range: '50 m.',  damage: null,    armor_piercing: null,  lethality: null, ammo_capacity: 1,  expense: 'Unusual',    is_restricted: true,  notes: 'Rayon 10 m. Pénalité −40%.' },
        ],
    },
    {
        key: 'firearms', label: 'Armes à feu',
        items: [
            { name: 'Pistolet léger',                     skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '10 m.',  damage: '1d8',   armor_piercing: null,  lethality: null, ammo_capacity: 12, expense: 'Standard',   is_restricted: false, notes: 'Ex : Walther PPK, .38 Special.' },
            { name: 'Pistolet moyen',                     skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '15 m.',  damage: '1d10',  armor_piercing: null,  lethality: null, ammo_capacity: 15, expense: 'Standard',   is_restricted: false, notes: 'Ex : Glock 17, Beretta M92FS, Colt M1911.' },
            { name: 'Pistolet lourd',                     skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '20 m.',  damage: '1d12',  armor_piercing: null,  lethality: null, ammo_capacity: 10, expense: 'Standard',   is_restricted: false, notes: 'Ex : Glock 20, .44 Magnum, .357 Magnum.' },
            { name: 'Fusil à pompe (balle)',              skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '75 m.',  damage: '2d6',   armor_piercing: null,  lethality: null, ammo_capacity: 5,  expense: 'Standard',   is_restricted: false, notes: 'Ex : Mossberg 500, Remington 870.' },
            { name: 'Fusil à pompe (chevrotine)',         skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '50 m.',  damage: '2d10',  armor_piercing: null,  lethality: null, ammo_capacity: 5,  expense: 'Standard',   is_restricted: false, notes: 'Dégâts complets ≤10 m. ; 1D10 ≤20 m. ; 1D6 au-delà.' },
            { name: 'Pistolet-mitrailleur (SMG)',         skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '50 m.',  damage: '1d10',  armor_piercing: null,  lethality: 10,  ammo_capacity: 30, expense: 'Unusual',    is_restricted: true,  notes: 'Ex : H&K MP5, FN P90. Rafale : utiliser Létalité.' },
            { name: 'Fusil léger / carabine',             skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '100 m.', damage: '1d12',  armor_piercing: '3',   lethality: 10,  ammo_capacity: 30, expense: 'Standard',   is_restricted: true,  notes: 'Ex : AR-15, AK-47, M4. Rafale : utiliser Létalité.' },
            { name: 'Fusil lourd',                        skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '150 m.', damage: '1d12+2', armor_piercing: '5',  lethality: 10,  ammo_capacity: 20, expense: 'Unusual',    is_restricted: true,  notes: 'Ex : H&K G3, FN FAL, Rem. 700. Rafale : Létalité.' },
            { name: 'Fusil très lourd',                   skill_ref: 'armes_feu',         skill_label: 'Armes à feu',        range: '250 m.', damage: null,    armor_piercing: '5',   lethality: 20,  ammo_capacity: 10, expense: 'Major',      is_restricted: false, notes: 'Ex : Barrett M82A1, .50 BMG.' },
        ],
    },
    {
        key: 'heavy', label: 'Armes lourdes',
        items: [
            { name: 'Lance-grenades',                     skill_ref: 'armes_lourdes',     skill_label: 'Armes lourdes',      range: '150 m.', damage: null,    armor_piercing: null,  lethality: 15,  ammo_capacity: 1,  expense: 'Major',      is_restricted: true,  notes: 'Rayon 10 m. Ex : M203, M320.' },
            { name: 'Roquette RPG',                       skill_ref: 'armes_lourdes',     skill_label: 'Armes lourdes',      range: '200 m.', damage: null,    armor_piercing: '20',  lethality: 30,  ammo_capacity: 1,  expense: 'Standard',   is_restricted: true,  notes: 'Rayon 10 m. Ex : RPG-7, M72 LAW.' },
            { name: 'Mitrailleuse légère (LMG)',          skill_ref: 'armes_lourdes',     skill_label: 'Armes lourdes',      range: '200 m.', damage: null,    armor_piercing: '3',   lethality: 10,  ammo_capacity: 200, expense: 'Major',    is_restricted: true,  notes: 'Ex : FN MINIMI (M249 SAW).' },
            { name: 'Mitrailleuse polyvalente (GPMG)',    skill_ref: 'armes_lourdes',     skill_label: 'Armes lourdes',      range: '300 m.', damage: null,    armor_piercing: '3',   lethality: 15,  ammo_capacity: 100, expense: 'Major',    is_restricted: true,  notes: 'Ex : FN MAG (M240), PKM.' },
            { name: 'Lance-flammes portatif',             skill_ref: 'armes_lourdes',     skill_label: 'Armes lourdes',      range: '5 m.',   damage: null,    armor_piercing: null,  lethality: 10,  ammo_capacity: 20, expense: 'Unusual',    is_restricted: true,  notes: 'Rayon 1 m. Ex : Ion XM42.' },
        ],
    },
    {
        key: 'demolitions', label: 'Démolitions',
        items: [
            { name: 'Cordeau détonant / explosif (500 g)', skill_ref: 'explosifs',        skill_label: 'Explosifs',          range: null,     damage: null,    armor_piercing: null,  lethality: 10,  ammo_capacity: null, expense: 'Incidental', is_restricted: true,  notes: 'Rayon 5 m.' },
            { name: 'Engin explosif improvisé (IED)',      skill_ref: 'explosifs',         skill_label: 'Explosifs',          range: null,     damage: null,    armor_piercing: null,  lethality: 15,  ammo_capacity: null, expense: 'Incidental', is_restricted: true,  notes: 'Rayon 10 m. Ex : bombe artisanale.' },
            { name: 'IED groupé',                         skill_ref: 'explosifs',         skill_label: 'Explosifs',          range: null,     damage: null,    armor_piercing: null,  lethality: 30,  ammo_capacity: null, expense: 'Incidental', is_restricted: true,  notes: 'Rayon 20 m.' },
            { name: 'Mine à pénétrateur formé',           skill_ref: 'explosifs',         skill_label: 'Explosifs',          range: null,     damage: null,    armor_piercing: '20',  lethality: 25,  ammo_capacity: null, expense: 'Standard',   is_restricted: true,  notes: 'Rayon 10 m. Ex : M21.' },
            { name: 'Explosif ANFO',                      skill_ref: 'explosifs',         skill_label: 'Explosifs',          range: null,     damage: null,    armor_piercing: null,  lethality: 30,  ammo_capacity: null, expense: 'Incidental', is_restricted: true,  notes: 'Rayon 20 m. Nitrate + diesel. Nécessite Science (Chimie) + Explosifs.' },
        ],
    },
    {
        key: 'artillery', label: 'Artillerie',
        items: [
            { name: 'Mortier léger',                      skill_ref: 'artillerie',        skill_label: 'Artillerie',         range: '2 km.',  damage: null,    armor_piercing: null,  lethality: 20,  ammo_capacity: null, expense: 'Major',      is_restricted: true,  notes: 'Rayon 25 m. Ex : M224.' },
            { name: 'Mortier lourd',                      skill_ref: 'artillerie',        skill_label: 'Artillerie',         range: '4 km.',  damage: null,    armor_piercing: '5',   lethality: 35,  ammo_capacity: null, expense: 'Major',      is_restricted: true,  notes: 'Rayon 50 m. Ex : M120.' },
            { name: 'Artillerie',                         skill_ref: 'artillerie',        skill_label: 'Artillerie',         range: '5 km.',  damage: null,    armor_piercing: '10',  lethality: 50,  ammo_capacity: null, expense: 'Extreme',    is_restricted: true,  notes: 'Rayon 100 m. Ex : M109, M777.' },
            { name: 'Missile antichar (ATGM)',            skill_ref: 'artillerie',        skill_label: 'Artillerie',         range: '4 km.',  damage: null,    armor_piercing: '25',  lethality: 45,  ammo_capacity: null, expense: 'Extreme',    is_restricted: true,  notes: 'Rayon 50 m. Ex : AGM-114 Hellfire.' },
            { name: 'Bombe polyvalente',                  skill_ref: 'artillerie',        skill_label: 'Artillerie',         range: 'Largage aérien', damage: null, armor_piercing: '10', lethality: 70, ammo_capacity: null, expense: 'Unusual', is_restricted: true,  notes: 'Rayon 100 m. Entraînement requis. Ex : Mk 82.' },
            { name: 'Missile de croisière',               skill_ref: 'artillerie',        skill_label: 'Artillerie',         range: '100 km.', damage: null,   armor_piercing: '15',  lethality: 80,  ammo_capacity: null, expense: 'Extreme',    is_restricted: true,  notes: 'Rayon 150 m. Ex : BGM-109 Tomahawk.' },
        ],
    },
];

// ── Catalogue équipement ──────────────────────────────────────────────────────
export const EQUIPMENT_CATALOG = [
    {
        key: 'armor', label: 'Armure',
        items: [
            { name: 'Casque anti-émeute',       notes: 'S\'ajoute à toute autre armure. Efficace uniquement contre mêlée/jet/mains nues. Non dissimulable.',   expense: 'Standard', is_restricted: false, jsonDetails: { rating: 1  } },
            { name: 'Casque Kevlar',             notes: 'S\'ajoute à toute autre armure. Non dissimulable.',                                                    expense: 'Standard', is_restricted: false, jsonDetails: { rating: 1  } },
            { name: 'Gilet Kevlar',              notes: 'Sous les vêtements : repérage nécessite un test de Vigilance.',                                        expense: 'Standard', is_restricted: false, jsonDetails: { rating: 3  } },
            { name: 'Gilet Kevlar renforcé',     notes: 'Test de Vigilance à −20%.',                                                                            expense: 'Unusual',  is_restricted: false, jsonDetails: { rating: 4  } },
            { name: 'Armure tactique',           notes: 'Non dissimulable.',                                                                                    expense: 'Unusual',  is_restricted: false, jsonDetails: { rating: 5  } },
            { name: 'Combinaison anti-bombe',    notes: 'Inclut casque. Non dissimulable.',                                                                     expense: 'Extreme',  is_restricted: false, jsonDetails: { rating: 10 } },
        ],
    },
    {
        key: 'vehicle_ground', label: 'Véhicules terrestres',
        items: [
            { name: 'Moto',                      notes: '',                                expense: 'Major',   is_restricted: false, jsonDetails: { hp: '15-20', armor_rating: 0,  speed: 'Rapide'  } },
            { name: 'Berline',                   notes: '',                                expense: 'Major',   is_restricted: false, jsonDetails: { hp: '25-30', armor_rating: 3,  speed: 'Moyenne' } },
            { name: 'Pick-up / SUV',             notes: '',                                expense: 'Major',   is_restricted: false, jsonDetails: { hp: '30-35', armor_rating: 3,  speed: 'Moyenne' } },
            { name: 'SUV blindé',                notes: '',                                expense: 'Extreme', is_restricted: false, jsonDetails: { hp: 35,      armor_rating: 10, speed: 'Moyenne' } },
            { name: 'Humvee',                    notes: '',                                expense: 'Extreme', is_restricted: false, jsonDetails: { hp: 40,      armor_rating: 3,  speed: 'Moyenne' } },
            { name: 'Humvee blindé',             notes: '',                                expense: 'Extreme', is_restricted: false, jsonDetails: { hp: 40,      armor_rating: 10, speed: 'Lente'   } },
            { name: 'Semi-remorque',             notes: '',                                expense: 'Extreme', is_restricted: false, jsonDetails: { hp: 45,      armor_rating: 3,  speed: 'Lente'   } },
            { name: 'MRAP',                      notes: 'Véhicule blindé anti-mines.',     expense: 'Extreme', is_restricted: false, jsonDetails: { hp: 60,      armor_rating: 20, speed: 'Lente'   } },
            { name: 'Transporteur blindé (APC)', notes: '',                                expense: 'Extreme', is_restricted: false, jsonDetails: { hp: 80,      armor_rating: 20, speed: 'Lente'   } },
            { name: 'Tank (milieu XXe)',          notes: '',                                expense: 'Extreme', is_restricted: false, jsonDetails: { hp: 90,      armor_rating: 20, speed: 'Lente'   } },
            { name: 'Tank moderne',              notes: '',                                expense: 'Extreme', is_restricted: false, jsonDetails: { hp: 100,     armor_rating: 25, speed: 'Lente'   } },
        ],
    },
    {
        key: 'vehicle_water', label: 'Véhicules nautiques',
        items: [
            { name: 'Embarcation caoutchouc de combat', notes: '',  expense: 'Unusual', is_restricted: false, jsonDetails: { hp: 10, armor_rating: 0, speed: 'Lente'   } },
            { name: 'Bateau pneumatique rigide',        notes: '',  expense: 'Major',   is_restricted: false, jsonDetails: { hp: 20, armor_rating: 0, speed: 'Lente'   } },
            { name: 'Patrouilleur fluvial',             notes: '',  expense: 'Extreme', is_restricted: false, jsonDetails: { hp: 30, armor_rating: 0, speed: 'Lente'   } },
            { name: 'Hors-bord',                        notes: '',  expense: 'Extreme', is_restricted: false, jsonDetails: { hp: 25, armor_rating: 0, speed: 'Moyenne' } },
        ],
    },
    {
        key: 'vehicle_air', label: 'Véhicules aériens',
        items: [
            { name: 'Hélicoptère civil',           notes: '', expense: 'Extreme', is_restricted: false, jsonDetails: { armor_rating: 0,  speed: 'Moyenne'  } },
            { name: 'Avion de ligne régionale',    notes: '', expense: 'Extreme', is_restricted: false, jsonDetails: { armor_rating: 0,  speed: 'Moyenne'  } },
            { name: 'Hélicoptère de police',       notes: '', expense: 'Extreme', is_restricted: false, jsonDetails: { armor_rating: 0,  speed: 'Rapide'   } },
            { name: 'Hélicoptère d\'attaque',      notes: '', expense: 'Extreme', is_restricted: false, jsonDetails: { armor_rating: 10, speed: 'Rapide'   } },
            { name: 'Avion de ligne (passagers)',  notes: '', expense: 'Extreme', is_restricted: false, jsonDetails: { armor_rating: 0,  speed: 'Spéciale' } },
            { name: 'Avion de chasse',             notes: '', expense: 'Extreme', is_restricted: false, jsonDetails: { armor_rating: 0,  speed: 'Spéciale' } },
        ],
    },
    {
        key: 'weapon_accessory', label: 'Accessoires armes',
        items: [
            { name: 'Visée holographique',         notes: '+20% si aucun dégât reçu depuis dernière action.',                                          expense: 'Standard', is_restricted: false, jsonDetails: { bonus: '+20% à toucher' } },
            { name: 'Visée nocturne',              notes: 'Double la portée de base la nuit si action Viser la fois précédente. 100h. Portée 400 m.', expense: 'Standard', is_restricted: false, jsonDetails: { bonus: 'Portée ×2 nuit' } },
            { name: 'Silencieux',                  notes: 'Test de Vigilance pour entendre à travers une cloison.',                                    expense: 'Standard', is_restricted: true,  jsonDetails: { bonus: 'Tir discret'    } },
            { name: 'Laser de pointage',           notes: '+20% si aucun dégât reçu. Pas besoin d\'épaule. 200 m. 100h.',                             expense: 'Standard', is_restricted: false, jsonDetails: { bonus: '+20% à toucher' } },
            { name: 'Lunette de visée télescopique', notes: 'Double la portée si action Viser la fois précédente.',                                   expense: 'Standard', is_restricted: false, jsonDetails: { bonus: 'Portée ×2'      } },
            { name: 'ACOG',                        notes: 'Combine holographique + télescopique.',                                                      expense: 'Unusual',  is_restricted: false, jsonDetails: { bonus: 'Holo + Télescopique' } },
            { name: 'Visée thermique (TWS)',        notes: 'Obscurité totale. 400 m. 2h. Portée ×2 si Viser.',                                        expense: 'Unusual',  is_restricted: false, jsonDetails: { bonus: 'Vision thermique' } },
            { name: 'Machine "ghost gun"',         notes: 'Fraiseuse 3D lourde. Nécessite INT×5 + entraînement ou Artisanat (Armurerie).',            expense: 'Major',    is_restricted: false, jsonDetails: { bonus: 'Fabrication arme' } },
        ],
    },
    {
        key: 'comms', label: 'Communications & Informatique',
        items: [
            { name: 'Téléphone jetable',                   notes: '',                                                                       expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Talkie-walkie / téléphone basique',   notes: '',                                                                       expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Logiciel de hacking basique',         notes: 'Nécessite Informatique.',                                                expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Kit oreillette communicateur',        notes: '',                                                                       expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Ordinateur standard',                 notes: '',                                                                       expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Tablette / smartphone récent',        notes: '',                                                                       expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Imprimante 3D (plastique)',           notes: '',                                                                       expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Téléphone satellite',                 notes: '',                                                                       expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Embaucher un hacker (chiffrement basique)', notes: 'Trouver via Criminologie si tâche illégale.',                      expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Ordinateur puissant',                 notes: '',                                                                       expense: 'Major',      is_restricted: false, jsonDetails: {} },
            { name: 'Logiciel chiffrement / data-mining',  notes: 'Nécessite Informatique ou entraînement spécial.',                        expense: 'Major',      is_restricted: true,  jsonDetails: {} },
            { name: 'Logiciel d\'analyse avancée',         notes: 'Nécessite Informatique ou entraînement spécial.',                        expense: 'Major',      is_restricted: true,  jsonDetails: {} },
            { name: 'Imprimante 3D (métal)',               notes: '',                                                                       expense: 'Major',      is_restricted: false, jsonDetails: {} },
            { name: 'Embaucher un hacker (chiffrement avancé)', notes: 'Trouver via Criminologie si tâche illégale.',                       expense: 'Major',      is_restricted: false, jsonDetails: {} },
            { name: 'Satellite dédié (usage exclusif)',    notes: 'Nécessite Informatique.',                                                expense: 'Extreme',    is_restricted: true,  jsonDetails: {} },
        ],
    },
    {
        key: 'surveillance', label: 'Surveillance & Effraction',
        items: [
            { name: 'Micro directionnel simple',             notes: 'Portée 10 m. en milieu urbain.',                                       expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Grande lampe torche',                   notes: 'Portée utile 100 m. Durée 10h.',                                      expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Lampe tactique / arme',                 notes: 'Portée 50 m. 1h. Options IR ou UV disponibles.',                      expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Jumelles ordinaires',                   notes: '×10. Permet tests de Vigilance à distance.',                          expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Kit de crochetage',                     notes: 'Nécessite entraînement spécial (DEX).',                               expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Détecteur de bugs',                     notes: '',                                                                    expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Fibroscope',                            notes: '',                                                                    expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Brouilleur GPS',                        notes: '',                                                                    expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Enregistreur vocal (activation vocale)', notes: '',                                                                   expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Micro directionnel + logiciel',         notes: 'Portée 20 m. en milieu urbain.',                                      expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Drone civil basique',                   notes: 'Nécessite entraînement spécial (DEX).',                              expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Jumelles de vision nocturne civiles',   notes: 'Durée 100h. Tests conduite/pilotage/attaque à −20%.',                expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Jumelles / télescope avancés',          notes: '×20.',                                                               expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Outil Halligan (forçage)',              notes: 'Permet un test de FOR pour forcer une barrière.',                     expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Pistolet à crochets',                   notes: 'Fonctionne uniquement sur serrures à barillet simple.',              expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Brouilleur audio (RF/cellulaire)',      notes: '',                                                                    expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Dispositif de tracking GPS',            notes: '',                                                                    expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Micro directionnel avancé + logiciel',  notes: 'Portée 50 m. en milieu urbain.',                                     expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Drone avancé',                          notes: 'Nécessite compétence Pilote (Drone).',                               expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Télescope puissant',                    notes: '×50.',                                                               expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Radar à pénétration de sol',            notes: 'Taille tondeuse. Entraînement spécial (INT) requis.',                expense: 'Major',      is_restricted: false, jsonDetails: {} },
            { name: 'Jumelles de vision nocturne militaires', notes: 'Pénalité −20% si perception fine requise.',                          expense: 'Major',      is_restricted: true,  jsonDetails: {} },
            { name: 'Drone militaire',                       notes: '',                                                                    expense: 'Extreme',    is_restricted: false, jsonDetails: {} },
        ],
    },
    {
        key: 'medical', label: 'Médical',
        items: [
            { name: 'Kit de premiers secours individuel',    notes: '+20% à un jet de Premiers secours.',                                  expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Petit extincteur CO2',                  notes: 'Éteint un petit feu. Peut repousser un animal (DEX×5).',             expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Équipement de protection individuelle (PPE)', notes: 'Armure 2 contre projections chimiques/acide.',                 expense: 'Incidental', is_restricted: false, jsonDetails: { rating: 2 } },
            { name: 'Extincteur industriel',                 notes: 'Éteint un feu de la taille d\'une pièce.',                          expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Masque à gaz',                          notes: 'Efficace contre les dangers en suspension dans l\'air.',             expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Combinaison HAZMAT',                    notes: 'Dangers aériens et par contact. 30 min pour enfiler.',               expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Kit médical premier répondant',         notes: '+20% à quatre jets de Premiers secours.',                            expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Équipement SCUBA',                      notes: 'Nécessite entraînement spécial (Natation).',                        expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Soins off-the-books (premiers secours)', notes: 'Trouver via Criminologie.',                                         expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Médicaments / chirurgie mineure off-the-books', notes: 'Trouver via Criminologie.',                                  expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Chirurgie majeure off-the-books',       notes: 'Trouver via Criminologie.',                                          expense: 'Major',      is_restricted: false, jsonDetails: {} },
            { name: 'Incinération discrète d\'un corps',     notes: 'Trouver via Criminologie.',                                          expense: 'Major',      is_restricted: false, jsonDetails: {} },
        ],
    },
    {
        key: 'survival', label: 'Survie',
        items: [
            { name: 'GPS portable',                          notes: 'Pas de signal radio requis. Batterie 14-25h.',                       expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Équipement de camping basique',         notes: '+20% à Survie pendant 3 jours.',                                    expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Équipement de camping étendu',          notes: '+20% à Survie pendant 14 jours.',                                   expense: 'Standard',   is_restricted: false, jsonDetails: {} },
        ],
    },
    {
        key: 'requisition', label: 'Réquisitions officielles',
        items: [
            // Law enforcement
            { name: 'Accès fichiers restreints (non classifiés)',       notes: 'Forces de l\'ordre. Doit concerner une enquête officielle.',          expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Garde à vue 24h sans questions',                   notes: 'Forces de l\'ordre. Enquête officielle requise.',                      expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Usage d\'un véhicule d\'agence pour la journée',  notes: 'Forces de l\'ordre.',                                                  expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Acquisition données d\'une autre affaire',         notes: 'Forces de l\'ordre.',                                                  expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Surveillance drone d\'un suspect (1-2 jours)',     notes: 'Forces de l\'ordre. Revue officielle automatique.',                    expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Déploiement de 2 à 5 policiers',                  notes: 'Forces de l\'ordre. Revue officielle automatique.',                    expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'SUV blindé réquisitionné (1 semaine)',             notes: 'Forces de l\'ordre.',                                                  expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Intervention SWAT régional',                       notes: 'Forces de l\'ordre. Revue officielle automatique.',                    expense: 'Extreme',    is_restricted: false, jsonDetails: {} },
            // Intelligence
            { name: 'Accès fichiers classifiés (hors sécurité nationale)', notes: 'Renseignement.',                                                   expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Surveillance drone d\'un site (courte durée)',     notes: 'Renseignement. Revue officielle automatique.',                         expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Accès fichiers de sécurité nationale',             notes: 'Renseignement. Techniquement de l\'espionnage.',                       expense: 'Major',      is_restricted: true,  jsonDetails: {} },
            { name: 'Surveillance drone/satellite étendue',             notes: 'Renseignement. Revue officielle automatique.',                         expense: 'Extreme',    is_restricted: false, jsonDetails: {} },
            // Military
            { name: 'Place sur vol de soutien programmé',              notes: 'Militaire.',                                                           expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Appui hélicoptère (transport/surveillance)',       notes: 'Militaire. Revue officielle automatique.',                             expense: 'Extreme',    is_restricted: false, jsonDetails: {} },
            { name: 'Frappe missile',                                   notes: 'Militaire. Revue officielle auto. Jamais sur sol américain.',          expense: 'Extreme',    is_restricted: true,  jsonDetails: {} },
        ],
    },
    {
        key: 'misc', label: 'Divers',
        items: [
            { name: 'Billet de bus (jour même)',                        notes: 'Transport.',                                                           expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Location voiture / SUV (1 semaine)',               notes: 'Transport.',                                                           expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Billet train/avion interurbain (jour même)',       notes: 'Transport.',                                                           expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Billet avion international — pays développé',      notes: 'Transport.',                                                           expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Hélicoptère affrété (aller simple)',               notes: 'Transport.',                                                           expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Billet avion international — pays en développement', notes: 'Transport.',                                                         expense: 'Major',      is_restricted: false, jsonDetails: {} },
            { name: 'Nuit(s) dans un motel bon marché',                 notes: 'Hébergement.',                                                        expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Semaine motel / appartement court terme',          notes: 'Hébergement.',                                                        expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Semaine hôtel de standing',                        notes: 'Hébergement.',                                                        expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Faux passeport / documents d\'identité',           notes: 'Légendes. Nécessite réquisition ou Criminologie.',                    expense: 'Unusual',    is_restricted: true,  jsonDetails: {} },
            { name: 'Faux passeport pays G-7',                          notes: 'Légendes. Nécessite réquisition ou Criminologie.',                    expense: 'Major',      is_restricted: true,  jsonDetails: {} },
            { name: 'Nouvelle identité complète',                       notes: 'Légendes. Nécessite réquisition ou Criminologie.',                    expense: 'Extreme',    is_restricted: true,  jsonDetails: {} },
            { name: 'Box de stockage (1 mois)',                         notes: 'Stockage.',                                                           expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Box de stockage (1 an)',                           notes: 'Stockage.',                                                           expense: 'Standard',   is_restricted: false, jsonDetails: {} },
            { name: 'Grand box de stockage (1 an)',                     notes: 'Stockage.',                                                           expense: 'Unusual',    is_restricted: false, jsonDetails: {} },
            { name: 'Menottes / liens flexibles',                       notes: 'Nécessite lame/ciseaux ou test FOR×5 +20% pour liens flexibles.',     expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Accès publications scientifiques',                 notes: 'Recherche.',                                                          expense: 'Incidental', is_restricted: false, jsonDetails: {} },
            { name: 'Conseil d\'expert professionnel/académique',       notes: 'Recherche.',                                                          expense: 'Standard',   is_restricted: false, jsonDetails: {} },
        ],
    },
];

export const EQUIPMENT_CATEGORY_ORDER = [
    'armor', 'vehicle_ground', 'vehicle_water', 'vehicle_air',
    'weapon_accessory', 'comms', 'surveillance',
    'medical', 'survival', 'requisition', 'misc',
];

export const EQUIPMENT_CATEGORY_LABELS = {
    armor:            'Armure',
    vehicle_ground:   'Véhicules terrestres',
    vehicle_water:    'Véhicules nautiques',
    vehicle_air:      'Véhicules aériens',
    comms:            'Communications & Informatique',
    surveillance:     'Surveillance & Effraction',
    medical:          'Médical',
    survival:         'Survie',
    weapon_accessory: 'Accessoires armes',
    requisition:      'Réquisitions officielles',
    misc:             'Divers',
};

export const CARAC_KEYS  = new Set(['str', 'con', 'dex', 'int', 'pow', 'cha']);
const CARAC_LABELS = { str: 'FOR', con: 'CON', dex: 'DEX', int: 'INT', pow: 'POU', cha: 'CHA' };

/**
 * Résout une skill_ref vers { score, label }.
 *   stat (str/dex/…) → score = char[stat] × 5
 *   skill key        → score depuis char.skills
 */
export function resolveSkillRef(char, ref) {
    if (!ref) return null;
    const key = ref.toLowerCase();
    if (CARAC_KEYS.has(key)) {
        return { score: (char[key] ?? 10) * 5, label: `${CARAC_LABELS[key]}×5` };
    }
    const skill = (char.skills ?? []).find(s => s.skillKey === key);
    if (skill) {
        const base = BASE_SKILLS.find(b => b.key === key);
        return { score: skill.score, label: base?.label ?? key };
    }
    return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION DU SYSTÈME
// ══════════════════════════════════════════════════════════════════════════════

const deltgreenConfig = {
    slug:  'deltagreen',
    label: 'Delta Green',

    // ── Bloc dés (diceEngine v2) ──────────────────────────────────────────────
    dice: {

        // 1. buildNotation(ctx) → string
        //    Delta Green : D100 pour les compétences/caractéristiques.
        //    Les jets de dommages (D4, D6, etc.) passent en notation directe.
        buildNotation: (ctx) => {
            const { diceType } = ctx.systemData;
            if (!diceType) throw new RollError('NO_DICE', 'Type de dé non spécifié');
            const n = diceType.toLowerCase().replace(/\s/g, '');
            // Notation complète (commence par un chiffre) → passée telle quelle
            // Notation simple (d10) → préfixée par 1
            return /^\d/.test(n) ? n : `1${n}`;
        },

        // 2. beforeRoll(ctx) → ctx
        //    Validation légère — le score cible est dans ctx.systemData.
        beforeRoll: (ctx) => {
            const { diceType } = ctx.systemData;
            // Accepte toute notation contenant d+chiffres : d100, 2d6, 1d4-1, 1d12+2…
            if (!diceType || !/d\d+/i.test(diceType)) {
                throw new RollError('INVALID_DICE', `Type de dé invalide : ${diceType}`);
            }
            return ctx;
        },

        afterRoll: (raw, ctx) => {
            const { diceType, targetScore, rollLabel, modifier } = ctx.systemData;
            const value = raw.groups[0].total;

            if (diceType === 'd100') {
                const tens  = value === 100 ? 0 : Math.floor(value / 10) * 10;
                const units = value % 10;
                const computed = (tens + units) === 0 ? 100 : (tens + units);
                const success    = computed <= (targetScore ?? 0);
                const tensDigit  = Math.floor(computed / 10) % 10;
                const unitsDigit = computed % 10;

                const isDouble  = tensDigit === unitsDigit;
                const critical  = computed === 1 || (success && isDouble);
                const fumble    = computed === 100 || (!success && isDouble);

                const toastAnimation = (computed === 1 || (success && isDouble)) ? 'glitter'
                    : (computed === 100 || (!success && isDouble)) ? 'shake'
                        : 'default';

                return {
                    value:          computed,
                    allDice:        [computed],
                    targetScore:    targetScore ?? 0,
                    modifier:       modifier ?? 0,
                    success,
                    critical,
                    fumble,
                    rollLabel:      rollLabel ?? '',
                    successes:      success ? 1 : 0,
                    toastAnimation,
                };
            }

            return {
                value,
                allDice:   [value],                   // ← pour le renderer générique
                diceType,
                rollLabel: rollLabel ?? 'Dommages',
                successes: 0,
            };
        },


        // 4. buildAnimationSequence(raw, ctx, result) → AnimationSequence | null
        buildAnimationSequence: (raw, ctx, result) => {
            const { diceType } = ctx.systemData;
            return {
                mode: 'single',
                groups: [{
                    id: 'main',
                    diceType: diceType === 'd100' ? '1d100+1d10' : diceType,
                    label:  ctx.systemData.rollLabel ?? '',
                    waves: [{dice: diceType === 'd100'
                            ? (() => {
                                const v = raw.groups[0].values[0];
                                return [v === 100 ? 0 : Math.floor(v/10)*10, v%10];
                            })()
                            : raw.groups[0].values
                    }]
                }],
            };
        },

        // 5. renderHistoryEntry — null : rendu générique plateforme suffisant
        renderHistoryEntry: (entry) => <DiceEntryHistory roll={entry} />,
    },

    // ── Bloc combat — stub (pas de TabCombat en v1) ───────────────────────────
    combat: {
        actionsMax: 0,

        renderNPCForm:        null,
        buildNPCCombatStats:  null,
        parseNPCCombatStats:  null,
        buildNPCHealthData:   null,
        getNPCRollContext:     null,
    },
    diceConfigDefault: {
        mode:   'custom',
        preset: null,
        custom: {
            foreground: '#e8e6d1', // Couleur papier jauni / texte de machine à écrire
            background: '#1a241e', // Vert sapin très sombre (militaire/forêt)
            outline:    '#7a1a1a', // Rouge sang séché / tampon "Top Secret"
            edge:       '#0d0d0d', // Noir pur pour la profondeur
            texture:    'glass',   // Ou 'cloudy' si disponible pour un effet usé
            material:   'plastic', // Plus proche des dés de JDR classiques ou bakélite
        },
        lightColor:       '#c2ffb8', // Une lueur verdâtre faible (type vision nocturne)
        strength:         5,
        gravity:          600,       // Gravité plus lourde pour un sentiment de fatalité
        sounds:           true,      // Le bruit des dés est crucial pour la tension
        animationEnabled: true,
    },
};

export default deltgreenConfig;